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

    // 仅更新 pending 状态的订单（幂等保护）
    if (newStatus && order.status === 'pending') {
      const { error: updateError } = await service
        .from('market_orders')
        .update({ status: newStatus })
        .eq('order_reference', orderReference)
        .eq('status', 'pending')

      if (updateError) {
        logger.error('WEBHOOK:WAYFORPAY-MARKET', 'Update failed', {
          orderReference,
          error: updateError.message,
        })
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
      }

      logger.info('WEBHOOK:WAYFORPAY-MARKET', 'Order updated', {
        orderReference,
        from: 'pending',
        to: newStatus,
      })

      // 回滚库存（过期/失败）
      if (shouldRollbackStock) {
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
