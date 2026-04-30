'use server'

import { randomBytes } from 'crypto'

import { getTranslatedText } from '@/lib/i18n-utils'
import { logger } from '@/lib/logger'
import { salePurchaseSchema } from '@/lib/market/market-validations'
import { createMarketPayment } from '@/lib/market/wayforpay'
import type { WayForPayPaymentParams } from '@/lib/payment/wayforpay/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import type { AppLocale } from '@/types'
import type { MarketItem, ShippingAddress } from '@/types/market'

interface CreateSaleOrderResult {
  success: boolean
  paymentParams?: WayForPayPaymentParams & Record<string, unknown>
  orderReference?: string
  amount?: number
  error?: string
}

export async function createSaleOrder(
  itemId: number,
  quantity: number,
  shipping: ShippingAddress,
  locale: string
): Promise<CreateSaleOrderResult> {
  // 1. 验证输入
  const VALID_LOCALES = ['en', 'zh', 'ua'] as const
  if (!VALID_LOCALES.includes(locale as any)) {
    return { success: false, error: 'validation_failed' }
  }
  const parsed = salePurchaseSchema.safeParse({ item_id: itemId, quantity, shipping })
  if (!parsed.success) {
    return { success: false, error: 'validation_failed' }
  }

  // 2. 验证认证
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'not_authenticated' }
  }

  const userId = user.id
  if (!user.email) {
    return { success: false, error: 'no_email' }
  }
  const userEmail = user.email

  // 3. 获取商品信息（RLS: 公开只读 on_sale 商品）
  const { data: item, error: itemError } = await supabase
    .from('market_items')
    .select('*')
    .eq('id', itemId)
    .eq('status', 'on_sale')
    .single()

  if (itemError || !item) {
    return { success: false, error: 'item_not_available' }
  }

  const typedItem = item as MarketItem
  if (!typedItem.fixed_price) {
    return { success: false, error: 'item_has_no_price' }
  }

  // 4. 生成订单编号（密码学安全随机数）
  const orderReference = `MKT-${Date.now()}-${randomBytes(8).toString('hex').toUpperCase()}`
  const totalAmount = Math.round(typedItem.fixed_price * quantity * 100) / 100
  const currency = typedItem.currency || 'USD'
  const itemTitle = getTranslatedText(typedItem.title_i18n, null, locale as AppLocale) || 'Item'

  // 5. 原子化：扣库存 + 创建订单（单个 PL/pgSQL 事务，失败自动回滚）
  const service = createServiceClient()
  // 新函数尚未加入 database.ts 类型定义，部署迁移后重新生成类型即可移除 cast
  const { data: orderId, error: atomicError } = await (service.rpc as any)(
    'create_market_order_atomic',
    {
      p_order_reference: orderReference,
      p_buyer_id: userId,
      p_buyer_email: userEmail,
      p_item_id: itemId,
      p_quantity: quantity,
      p_unit_price: typedItem.fixed_price,
      p_total_amount: totalAmount,
      p_currency: currency,
      p_payment_method: 'wayforpay',
      p_shipping_name: shipping.name,
      p_shipping_phone: shipping.phone || null,
      p_shipping_address_line1: shipping.address_line1,
      p_shipping_address_line2: shipping.address_line2 || null,
      p_shipping_city: shipping.city,
      p_shipping_state: shipping.state || null,
      p_shipping_postal_code: shipping.postal_code,
      p_shipping_country: shipping.country,
      p_locale: locale,
    }
  )

  if (atomicError || !orderId) {
    const isStockError = atomicError?.message?.includes('INSUFFICIENT_STOCK')
    if (isStockError) {
      logger.warn('MARKET:SALE', 'Stock insufficient', { itemId, quantity })
      return { success: false, error: 'insufficient_stock' }
    }
    logger.error('MARKET:SALE', 'Atomic order creation failed', { error: atomicError?.message })
    return { success: false, error: 'order_creation_failed' }
  }

  const order = { id: String(orderId) }

  // 7. 生成 WayForPay 支付参数
  try {
    const currency = (typedItem.currency || 'USD') as 'UAH' | 'USD' | 'EUR'
    const paymentParams = createMarketPayment({
      orderReference,
      itemTitle,
      unitPrice: typedItem.fixed_price,
      quantity,
      currency,
      buyerName: shipping.name,
      buyerEmail: userEmail,
      locale,
    })

    logger.info('MARKET:SALE', 'Order created with payment params', {
      orderReference,
      itemId,
      quantity,
      totalAmount,
    })

    return {
      success: true,
      paymentParams: paymentParams as WayForPayPaymentParams & Record<string, unknown>,
      orderReference,
      amount: totalAmount,
    }
  } catch (err) {
    // 错误恢复：先标记 expired 再恢复库存，防止 cron 二次恢复导致库存虚增
    const { data: expiredRows } = await service
      .from('market_orders')
      .update({ status: 'expired' })
      .eq('order_reference', orderReference)
      .eq('status', 'pending')
      .select('id')
    if (expiredRows && expiredRows.length > 0) {
      await restoreStock(service, itemId, quantity)
    }
    // 若 update 未匹配（DB 异常），由 cron 统一处理过期和库存恢复

    logger.error('MARKET:SALE', 'Payment params generation failed', {
      orderReference,
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false, error: 'payment_params_failed' }
  }
}

/**
 * 标记义卖订单为 widget_load_failed 并回滚库存
 *
 * 当支付组件加载失败时由前端调用。
 * 通过 RLS 策略保护：仅允许 buyer_id = auth.uid() 且 status = 'pending' → 'widget_load_failed'
 */
export async function markMarketOrderWidgetFailed(
  orderReference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()

    // 1. 更新状态（RLS 确保只能改自己的 pending 订单）
    const { data, error } = await supabase
      .from('market_orders')
      .update({ status: 'widget_load_failed' })
      .eq('order_reference', orderReference)
      .eq('status', 'pending')
      .select('item_id, quantity')

    if (error) {
      logger.error('MARKET:SALE', 'Failed to mark as widget_load_failed', {
        orderReference,
        error: error.message,
      })
      return { success: false, error: 'operation_failed' }
    }

    if (!data || data.length === 0) {
      logger.debug('MARKET:SALE', 'No pending order to mark as widget_load_failed', {
        orderReference,
      })
      return { success: true }
    }

    // 2. 回滚库存（需要 service client 绕过 RLS 执行 RPC）
    const service = createServiceClient()
    const order = data[0]
    const restored = await restoreStock(service, order.item_id, order.quantity)
    if (!restored) {
      logger.error('MARKET:SALE', 'widget_load_failed: stock restore FAILED', {
        orderReference,
        itemId: order.item_id,
        quantity: order.quantity,
      })
    }

    logger.info('MARKET:SALE', 'Marked as widget_load_failed + stock rolled back', {
      orderReference,
      itemId: order.item_id,
      quantity: order.quantity,
    })
    return { success: true }
  } catch (error) {
    logger.error('MARKET:SALE', 'markMarketOrderWidgetFailed failed', {
      orderReference,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: 'operation_failed' }
  }
}

/**
 * 买家主动取消 pending 订单（标记为 expired）并回滚库存
 *
 * 场景：支付页面用户点击"修改信息并重试"按钮。
 * 通过 RLS 策略保护：仅允许 buyer_id = auth.uid() 且 status = 'pending' → 'expired'
 */
export async function cancelMarketOrder(
  orderReference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('market_orders')
      .update({ status: 'expired' })
      .eq('order_reference', orderReference)
      .eq('status', 'pending')
      .select('item_id, quantity')

    if (error) {
      logger.error('MARKET:SALE', 'Failed to cancel order (expired)', {
        orderReference,
        error: error.message,
      })
      return { success: false, error: 'operation_failed' }
    }

    if (!data || data.length === 0) {
      // P2-6: 订单可能已被 Webhook 处理为 paid — 告知前端不要回到 checkout
      logger.warn('MARKET:SALE', 'No pending order to cancel — may already be processed', {
        orderReference,
      })
      return { success: false, error: 'order_already_processed' }
    }

    const service = createServiceClient()
    const order = data[0]
    const restored = await restoreStock(service, order.item_id, order.quantity)
    if (!restored) {
      logger.error('MARKET:SALE', 'cancel order: stock restore FAILED', {
        orderReference,
        itemId: order.item_id,
        quantity: order.quantity,
      })
    }

    logger.info('MARKET:SALE', 'Order cancelled (expired) + stock rolled back', {
      orderReference,
      itemId: order.item_id,
      quantity: order.quantity,
    })
    return { success: true }
  } catch (error) {
    logger.error('MARKET:SALE', 'cancelMarketOrder failed', {
      orderReference,
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: 'operation_failed' }
  }
}

/** 原子恢复库存，返回是否成功 */
async function restoreStock(
  service: ReturnType<typeof createServiceClient>,
  itemId: number,
  quantity: number
): Promise<boolean> {
  const { error } = await service.rpc('restore_stock', {
    p_item_id: itemId,
    p_quantity: quantity,
  })
  if (error) {
    logger.error('MARKET:SALE', 'restore_stock FAILED — manual intervention needed', {
      itemId,
      quantity,
      error: error.message,
    })
    return false
  }
  return true
}
