import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { verifyWayForPaySignature } from '@/lib/market/wayforpay'
import { WAYFORPAY_STATUS } from '@/lib/payment/wayforpay/server'
import { respondWithAccept } from '@/lib/payment/wayforpay/webhook-response'
import { createServiceClient } from '@/lib/supabase/server'
import type { AppLocale } from '@/types'
import type { MarketOrderStatus } from '@/types/market'

/**
 * WayForPay Market Webhook Handler
 *
 * 处理义卖支付回调，与捐赠 Webhook 完全隔离。
 * 签名验证和响应格式与现有捐赠 Webhook 一致。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const transactionStatus = body.transactionStatus
    const orderReference = body.orderReference

    logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Webhook received', {
      status: transactionStatus,
      orderReference,
    })

    // 验证 orderReference 命名空间（防止捐赠回调误入义卖端点）
    if (!orderReference || !String(orderReference).startsWith('MKT-')) {
      logger.warn('WEBHOOK:WAYFORPAY-MARKET', 'Non-market orderReference rejected', {
        orderReference,
      })
      return NextResponse.json({ error: 'Invalid order reference' }, { status: 400 })
    }

    // 验证 merchantAccount（缺失或不匹配均拒绝）
    if (!body.merchantAccount || body.merchantAccount !== process.env.WAYFORPAY_MERCHANT_ACCOUNT) {
      logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Merchant account mismatch', {
        orderReference,
        received: body.merchantAccount,
      })
      return NextResponse.json({ error: 'Invalid merchant' }, { status: 400 })
    }

    // 验证签名
    if (!body.merchantSignature || !verifyWayForPaySignature(body, body.merchantSignature)) {
      logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Invalid signature', { orderReference })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const service = createServiceClient()

    // 查询订单（含 total_amount 用于金额校验）
    const { data: order, error: fetchError } = await service
      .from('market_orders')
      .select('id, status, item_id, quantity, total_amount')
      .eq('order_reference', orderReference)
      .single()

    if (fetchError || !order) {
      logger.warn('WEBHOOK:WAYFORPAY-MARKET', 'Order not found', { orderReference })
      return respondWithAccept(orderReference)
    }

    // 映射 WayForPay 状态 → 订单状态
    let newStatus: MarketOrderStatus | null = null
    let shouldRollbackStock = false

    switch (transactionStatus) {
      case WAYFORPAY_STATUS.APPROVED:
      case WAYFORPAY_STATUS.WAITING_AUTH_COMPLETE:
        newStatus = 'paid'
        logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Payment approved', { orderReference })
        break

      case WAYFORPAY_STATUS.EXPIRED:
        newStatus = 'expired'
        shouldRollbackStock = true
        logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Payment expired', { orderReference })
        break

      case WAYFORPAY_STATUS.DECLINED:
        newStatus = 'declined'
        shouldRollbackStock = true
        logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Payment declined', { orderReference })
        break

      case WAYFORPAY_STATUS.IN_PROCESSING:
      case WAYFORPAY_STATUS.PENDING:
        // 保持 pending，仅记录日志
        logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Payment processing', {
          orderReference,
          status: transactionStatus,
        })
        return respondWithAccept(orderReference)

      default:
        logger.warn('WEBHOOK:WAYFORPAY-MARKET', 'Unknown status', {
          orderReference,
          status: transactionStatus,
        })
        return respondWithAccept(orderReference)
    }

    // ── 金额校验（仅对 paid，expired/declined 回调可能不携带 amount）──
    if (newStatus === 'paid') {
      const callbackAmount = parseFloat(String(body.amount ?? ''))
      if (isNaN(callbackAmount)) {
        logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Missing or invalid amount for paid callback', {
          orderReference,
        })
        return respondWithAccept(orderReference)
      }
      const expectedAmount = Number(order.total_amount)
      if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
        logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Amount mismatch', {
          orderReference,
          expected: expectedAmount,
          received: callbackAmount,
        })
        return respondWithAccept(orderReference)
      }
    }

    // ── 原子更新 ─────────────────────────────────────
    // 每次 UPDATE 用 .eq('status', X) 做原子条件匹配（CAS），
    // 避免 SELECT-UPDATE 之间的 TOCTOU 竞态。
    //
    // 恢复路径（widget_load_failed/expired → paid）：
    // 先扣库存再改状态，防止超卖（扣库存失败则不改状态）。
    //
    // | 前置状态              | 目标状态          | 顺序                     |
    // |-----------------------|-------------------|--------------------------|
    // | pending               | paid              | 直接改状态（库存已扣）    |
    // | pending               | expired/declined  | 改状态 → 回滚库存        |
    // | widget_load_failed    | paid              | 先扣库存 → 再改状态      |
    // | widget_load_failed    | expired/declined  | 直接改状态（库存已回滚）  |
    // | expired               | paid              | 先扣库存 → 再改状态      |
    if (newStatus) {
      let actualPreviousStatus: MarketOrderStatus | null = null

      // 辅助：CAS 更新状态
      async function casUpdate(
        fromStatus: MarketOrderStatus
      ): Promise<{ matched: boolean; error?: string }> {
        const { data, error } = await service
          .from('market_orders')
          .update({ status: newStatus! })
          .eq('order_reference', orderReference)
          .eq('status', fromStatus)
          .select('id')
        if (error) return { matched: false, error: error.message }
        return { matched: !!(data && data.length > 0) }
      }

      // 辅助：恢复路径（widget_load_failed / expired → paid）
      //   1. 先扣库存（避免超卖）
      //   2. CAS 更新 fromStatus → newStatus
      //   3. CAS 失败时回滚刚扣的库存
      // 仅当 newStatus === 'paid' 时调用。返回是否成功匹配 fromStatus。
      // itemId/quantity 显式传入，避免 nested fn 边界破坏 TS 对 order 的 narrow。
      async function attemptStockRecoveryAndCAS(
        fromStatus: 'widget_load_failed' | 'expired',
        itemId: number,
        quantity: number
      ): Promise<boolean> {
        const { data: decremented, error: dErr } = await service.rpc('decrement_stock', {
          p_item_id: itemId,
          p_quantity: quantity,
        })
        if (dErr || !decremented) {
          logger.error(
            'WEBHOOK:WAYFORPAY-MARKET',
            `Re-decrement stock failed for ${fromStatus} recovery — order stays ${fromStatus}`,
            {
              orderReference,
              itemId,
              error: dErr?.message,
            }
          )
          return false
        }
        const r = await casUpdate(fromStatus)
        if (r.error || !r.matched) {
          // CAS 失败（已被其他 Webhook 处理） → 回滚刚扣的库存
          await service.rpc('restore_stock', {
            p_item_id: itemId,
            p_quantity: quantity,
          })
          logger.warn(
            'WEBHOOK:WAYFORPAY-MARKET',
            `${fromStatus} CAS failed after stock decrement — stock restored`,
            { orderReference }
          )
          return false
        }
        logger.info(
          'WEBHOOK:WAYFORPAY-MARKET',
          `Stock re-decremented + status recovered from ${fromStatus}`,
          {
            orderReference,
            itemId,
            quantity,
          }
        )
        return true
      }

      // 尝试 1: 从 pending 转换（库存在下单时已扣减，无需额外操作）
      const r1 = await casUpdate('pending')
      if (r1.error) {
        logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Update from pending failed', {
          orderReference,
          error: r1.error,
        })
        return respondWithAccept(orderReference)
      }

      if (r1.matched) {
        actualPreviousStatus = 'pending'
      } else {
        // 尝试 2: 从 widget_load_failed 转换
        if (newStatus === 'paid') {
          // 恢复路径：先扣库存再改状态
          if (
            await attemptStockRecoveryAndCAS('widget_load_failed', order.item_id, order.quantity)
          ) {
            actualPreviousStatus = 'widget_load_failed'
          }
          // 扣库存或 CAS 失败 → 不改状态，由管理员人工处理 / 已由 helper 回滚
        } else {
          // 非 paid（expired/declined）→ 无需库存操作，直接改状态
          const r2 = await casUpdate('widget_load_failed')
          if (r2.error) {
            logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Update from widget_load_failed failed', {
              orderReference,
              error: r2.error,
            })
            return respondWithAccept(orderReference)
          }
          if (r2.matched) actualPreviousStatus = 'widget_load_failed'
        }

        // 尝试 3: 从 expired 恢复（仅 paid）
        if (!actualPreviousStatus && newStatus === 'paid') {
          if (await attemptStockRecoveryAndCAS('expired', order.item_id, order.quantity)) {
            actualPreviousStatus = 'expired'
          }
        }
      }

      if (!actualPreviousStatus) {
        logger.debug(
          'WEBHOOK:WAYFORPAY-MARKET',
          'No order in transitionable state (already processed)',
          {
            orderReference,
          }
        )
        return respondWithAccept(orderReference)
      }

      logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Order updated', {
        orderReference,
        from: actualPreviousStatus,
        to: newStatus,
      })

      // ── 库存回滚（pending → expired/declined） ─────────
      if (actualPreviousStatus === 'pending' && shouldRollbackStock) {
        const { error: rollbackError } = await service.rpc('restore_stock', {
          p_item_id: order.item_id,
          p_quantity: order.quantity,
        })
        if (rollbackError) {
          logger.error(
            'WEBHOOK:WAYFORPAY-MARKET',
            'Stock rollback FAILED — manual intervention needed',
            {
              orderReference,
              itemId: order.item_id,
              quantity: order.quantity,
              error: rollbackError.message,
            }
          )
        } else {
          logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Stock rolled back', {
            orderReference,
            itemId: order.item_id,
            quantity: order.quantity,
          })
        }
      }

      // ── 支付成功邮件 ─────────────────────────────────
      if (newStatus === 'paid') {
        try {
          const { data: fullOrder } = await service
            .from('market_orders')
            .select(
              'order_reference, buyer_email, shipping_name, shipping_city, shipping_country, quantity, unit_price, total_amount, currency, locale, market_items(title_i18n)'
            )
            .eq('order_reference', orderReference)
            .single()

          if (fullOrder && fullOrder.buyer_email) {
            const { sendMarketOrderPaidEmail } = await import('@/lib/email')
            await sendMarketOrderPaidEmail({
              to: fullOrder.buyer_email,
              locale: (fullOrder.locale || 'en') as AppLocale,
              shippingName: fullOrder.shipping_name,
              orderReference: fullOrder.order_reference,
              itemTitleI18n: (fullOrder.market_items as any)?.title_i18n || {
                en: '',
                zh: '',
                ua: '',
              },
              quantity: fullOrder.quantity,
              unitPrice: Number(fullOrder.unit_price),
              totalAmount: Number(fullOrder.total_amount),
              currency: fullOrder.currency,
              shippingCity: fullOrder.shipping_city,
              shippingCountry: fullOrder.shipping_country,
            })
            logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Payment confirmed email sent', {
              orderReference,
            })
          }
        } catch (emailError) {
          logger.error(
            'WEBHOOK:WAYFORPAY-MARKET',
            'Failed to send payment confirmed email (non-blocking)',
            {
              orderReference,
              error: emailError instanceof Error ? emailError.message : String(emailError),
            }
          )
        }
      }
    }

    return respondWithAccept(orderReference)
  } catch (error) {
    logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
