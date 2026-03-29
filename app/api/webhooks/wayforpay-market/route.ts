import { NextResponse } from 'next/server'
import {
  verifyWayForPaySignature,
  generateWebhookResponseSignature,
} from '@/lib/market/wayforpay'
import { WAYFORPAY_STATUS } from '@/lib/payment/wayforpay/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
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

    // 金额校验：防止客户端篡改支付金额
    if (body.amount !== undefined && order.total_amount !== undefined) {
      const callbackAmount = Number(body.amount)
      const expectedAmount = Number(order.total_amount)
      if (Math.abs(callbackAmount - expectedAmount) > expectedAmount * 0.01) {
        logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Amount mismatch', {
          orderReference,
          expected: expectedAmount,
          received: callbackAmount,
        })
        return respondWithAccept(orderReference)
      }
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

    // ── 原子更新 ─────────────────────────────────────
    // 分别尝试从 pending 和 widget_load_failed 转换，
    // 每次 UPDATE 用 .eq('status', X) 做原子条件匹配，
    // 避免 SELECT-UPDATE 之间的 TOCTOU 竞态，确保库存操作基于真实前置状态
    if (newStatus) {
      let actualPreviousStatus: MarketOrderStatus | null = null

      // 尝试 1: 从 pending 转换
      const { data: fromPending, error: pendingError } = await service
        .from('market_orders')
        .update({ status: newStatus })
        .eq('order_reference', orderReference)
        .eq('status', 'pending')
        .select('id')

      if (pendingError) {
        logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Update from pending failed', {
          orderReference,
          error: pendingError.message,
        })
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      }

      if (fromPending && fromPending.length > 0) {
        actualPreviousStatus = 'pending'
      } else {
        // 尝试 2: 从 widget_load_failed 转换
        const { data: fromWidgetFailed, error: wlfError } = await service
          .from('market_orders')
          .update({ status: newStatus })
          .eq('order_reference', orderReference)
          .eq('status', 'widget_load_failed')
          .select('id')

        if (wlfError) {
          logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Update from widget_load_failed failed', {
            orderReference,
            error: wlfError.message,
          })
          return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
        }

        if (fromWidgetFailed && fromWidgetFailed.length > 0) {
          actualPreviousStatus = 'widget_load_failed'
        } else if (newStatus === 'paid') {
          // 尝试 3: 从 expired 恢复（cron 已将 pending 清理为 expired，但用户实际完成了支付）
          const { data: fromExpired, error: expiredError } = await service
            .from('market_orders')
            .update({ status: newStatus })
            .eq('order_reference', orderReference)
            .eq('status', 'expired')
            .select('id')

          if (expiredError) {
            logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Update from expired failed', {
              orderReference,
              error: expiredError.message,
            })
            return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
          }

          if (fromExpired && fromExpired.length > 0) {
            actualPreviousStatus = 'expired'
            logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Recovering expired order — payment arrived after cron cleanup', {
              orderReference,
            })
          }
        }
      }

      if (!actualPreviousStatus) {
        logger.debug('WEBHOOK:WAYFORPAY-MARKET', 'No order in transitionable state (already processed)', {
          orderReference,
        })
        return respondWithAccept(orderReference)
      }

      logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Order updated', {
        orderReference,
        from: actualPreviousStatus,
        to: newStatus,
      })

      // ── 库存处理 ─────────────────────────────────────
      // actualPreviousStatus 由原子 UPDATE 的 .eq('status', X) 确认，非 stale read
      //
      // | actualPreviousStatus  | newStatus         | 库存操作           |
      // |-----------------------|-------------------|--------------------|
      // | pending               | paid              | 无（库存已扣）      |
      // | pending               | expired/declined  | 回滚库存           |
      // | widget_load_failed    | paid              | 重新扣减库存        |
      // | widget_load_failed    | expired/declined  | 无（已回滚过）      |
      // | expired               | paid              | 重新扣减库存        |

      const needsReDecrement = (actualPreviousStatus === 'widget_load_failed' || actualPreviousStatus === 'expired') && newStatus === 'paid'

      if (needsReDecrement) {
        // 从 widget_load_failed 或 expired 恢复为 paid — 库存已回滚，需重新扣减
        const { data: decremented, error: decrementError } = await service
          .rpc('decrement_stock', { p_item_id: order.item_id, p_quantity: order.quantity })

        if (decrementError || !decremented) {
          logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Re-decrement stock FAILED after recovery — manual intervention needed', {
            orderReference,
            itemId: order.item_id,
            quantity: order.quantity,
            error: decrementError?.message,
          })
        } else {
          logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Stock re-decremented after recovery', {
            orderReference,
            itemId: order.item_id,
            quantity: order.quantity,
          })
        }
      } else if (actualPreviousStatus === 'pending' && shouldRollbackStock) {
        // 从 pending 变为 expired/declined — 正常回滚库存
        const { error: rollbackError } = await service.rpc('restore_stock', {
          p_item_id: order.item_id,
          p_quantity: order.quantity,
        })
        if (rollbackError) {
          logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Stock rollback FAILED — manual intervention needed', {
            orderReference,
            itemId: order.item_id,
            quantity: order.quantity,
            error: rollbackError.message,
          })
        } else {
          logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Stock rolled back', {
            orderReference,
            itemId: order.item_id,
            quantity: order.quantity,
          })
        }
      }
      // widget_load_failed/expired + shouldRollbackStock → 无操作（库存已回滚过）

      // TODO: Phase 5 — 支付成功时发送确认邮件
    }

    return respondWithAccept(orderReference)
  } catch (error) {
    logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

/** 生成 WayForPay 确认响应（含签名） */
function respondWithAccept(orderReference: string) {
  const time = Math.floor(Date.now() / 1000)
  const signature = generateWebhookResponseSignature(orderReference, 'accept', time)
  return NextResponse.json({ orderReference, status: 'accept', time, signature })
}
