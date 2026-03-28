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

  // 3. 使用 Service Client 执行业务操作（绕过 RLS）
  const service = createServiceClient()

  // 4. 获取商品信息
  const { data: item, error: itemError } = await service
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

  // 5. 原子扣减库存（通过 RPC 在数据库层完成，防止 TOCTOU 竞态）
  const { data: decremented, error: stockError } = await service
    .rpc('decrement_stock', { p_item_id: itemId, p_quantity: quantity })

  if (stockError || !decremented) {
    logger.warn('MARKET:SALE', 'Stock insufficient or decrement failed', { itemId, quantity, error: stockError?.message })
    return { success: false, error: 'insufficient_stock' }
  }

  // 6. 生成订单编号
  const orderReference = `MKT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const totalAmount = typedItem.fixed_price * quantity
  const itemTitle = getTranslatedText(typedItem.title_i18n, locale as SupportedLocale) || 'Item'

  // 7. 创建订单
  const { data: order, error: orderError } = await service
    .from('market_orders')
    .insert({
      order_reference: orderReference,
      buyer_id: userId,
      buyer_email: userEmail,
      item_id: itemId,
      quantity,
      unit_price: typedItem.fixed_price,
      total_amount: totalAmount,
      payment_method: 'wayforpay',
      shipping_name: shipping.name,
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
    // 回滚库存
    await restoreStock(service, itemId, quantity)
    logger.error('MARKET:SALE', 'Order creation failed', { error: orderError?.message })
    return { success: false, error: 'order_creation_failed' }
  }

  // 8. 生成 WayForPay 支付参数
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
    // 回滚：删除订单 + 恢复库存
    await service.from('market_orders').delete().eq('id', order.id)
    await restoreStock(service, itemId, quantity)

    logger.error('MARKET:SALE', 'Payment params generation failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false, error: 'payment_params_failed' }
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

/** 库存回滚（Webhook 过期/失败时调用） */
export async function rollbackSaleStock(orderReference: string): Promise<void> {
  const service = createServiceClient()

  const { data: order } = await service
    .from('market_orders')
    .select('item_id, quantity')
    .eq('order_reference', orderReference)
    .eq('status', 'pending')
    .single()

  if (!order) return

  const restored = await restoreStock(service, order.item_id, order.quantity)
  if (!restored) {
    logger.error('MARKET:SALE', 'rollbackSaleStock: stock restore failed, skipping status update', { orderReference })
    return
  }

  await service
    .from('market_orders')
    .update({ status: 'expired' })
    .eq('order_reference', orderReference)
    .eq('status', 'pending')

  logger.info('MARKET:SALE', 'Stock rolled back', { orderReference })
}
