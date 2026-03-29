'use server'

import { createServerClient, createServiceClient } from '@/lib/supabase/server'
import { createMarketPayment } from '@/lib/market/wayforpay'
import { salePurchaseSchema } from '@/lib/market/market-validations'
import { getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import { logger } from '@/lib/logger'
import type { ShippingAddress, MarketItem } from '@/types/market'
import type { WayForPayPaymentParams } from '@/lib/payment/wayforpay/server'

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
  const parsed = salePurchaseSchema.safeParse({ item_id: itemId, quantity, shipping })
  if (!parsed.success) {
    return { success: false, error: 'validation_failed' }
  }

  // 2. 验证认证
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
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

  // 4. 原子扣减库存（RPC SECURITY DEFINER, 仅 service_role 可调用）
  const service = createServiceClient()
  const { data: decremented, error: stockError } = await service
    .rpc('decrement_stock', { p_item_id: itemId, p_quantity: quantity })

  if (stockError || !decremented) {
    logger.warn('MARKET:SALE', 'Stock insufficient or decrement failed', { itemId, quantity, error: stockError?.message })
    return { success: false, error: 'insufficient_stock' }
  }

  // 5. 生成订单编号
  const orderReference = `MKT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const totalAmount = typedItem.fixed_price * quantity
  const currency = typedItem.currency || 'USD'
  const itemTitle = getTranslatedText(typedItem.title_i18n, null, locale as SupportedLocale) || 'Item'

  // 6. 创建订单（RLS: buyer_id = auth.uid() AND status = 'pending'）
  const { data: order, error: orderError } = await supabase
    .from('market_orders')
    .insert({
      order_reference: orderReference,
      buyer_id: userId,
      buyer_email: userEmail,
      item_id: itemId,
      quantity,
      unit_price: typedItem.fixed_price,
      total_amount: totalAmount,
      currency,
      payment_method: 'wayforpay',
      shipping_name: shipping.name,
      shipping_phone: shipping.phone || null,
      shipping_address_line1: shipping.address_line1,
      shipping_address_line2: shipping.address_line2 || null,
      shipping_city: shipping.city,
      shipping_state: shipping.state || null,
      shipping_postal_code: shipping.postal_code,
      shipping_country: shipping.country,
      status: 'pending',
      locale,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    // 错误恢复：restore_stock 仅限 service_role
    const service = createServiceClient()
    await restoreStock(service, itemId, quantity)
    logger.error('MARKET:SALE', 'Order creation failed', { error: orderError?.message })
    return { success: false, error: 'order_creation_failed' }
  }

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
    // 错误恢复：删除订单 + 恢复库存（service_role）
    const service = createServiceClient()
    await service.from('market_orders').delete().eq('id', order.id)
    await restoreStock(service, itemId, quantity)

    logger.error('MARKET:SALE', 'Payment params generation failed', {
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
        orderReference, error: error.message,
      })
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      logger.debug('MARKET:SALE', 'No pending order to mark as widget_load_failed', { orderReference })
      return { success: true }
    }

    // 2. 回滚库存（需要 service client 绕过 RLS 执行 RPC）
    const service = createServiceClient()
    const order = data[0]
    const restored = await restoreStock(service, order.item_id, order.quantity)
    if (!restored) {
      logger.error('MARKET:SALE', 'widget_load_failed: stock restore FAILED', {
        orderReference, itemId: order.item_id, quantity: order.quantity,
      })
    }

    logger.info('MARKET:SALE', 'Marked as widget_load_failed + stock rolled back', {
      orderReference, itemId: order.item_id, quantity: order.quantity,
    })
    return { success: true }
  } catch (error) {
    logger.error('MARKET:SALE', 'markMarketOrderWidgetFailed failed', {
      orderReference, error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
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
        orderReference, error: error.message,
      })
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      logger.debug('MARKET:SALE', 'No pending order to cancel', { orderReference })
      return { success: true }
    }

    const service = createServiceClient()
    const order = data[0]
    const restored = await restoreStock(service, order.item_id, order.quantity)
    if (!restored) {
      logger.error('MARKET:SALE', 'cancel order: stock restore FAILED', {
        orderReference, itemId: order.item_id, quantity: order.quantity,
      })
    }

    logger.info('MARKET:SALE', 'Order cancelled (expired) + stock rolled back', {
      orderReference, itemId: order.item_id, quantity: order.quantity,
    })
    return { success: true }
  } catch (error) {
    logger.error('MARKET:SALE', 'cancelMarketOrder failed', {
      orderReference, error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
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

