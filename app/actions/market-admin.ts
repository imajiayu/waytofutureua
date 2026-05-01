'use server'

import { getMarketOrderFiles } from '@/app/actions/market-order-files'
import { logger } from '@/lib/logger'
import {
  getFileCategory,
  isValidItemTransition,
  isValidOrderTransition,
  needsFileUpload,
  needsTrackingNumber,
} from '@/lib/market/market-status'
import type { CreateMarketItemInput } from '@/lib/market/market-validations'
import { createMarketItemSchema, updateOrderStatusSchema } from '@/lib/market/market-validations'
import { getAdminClient } from '@/lib/supabase/action-clients'
import type {
  AdminMarketOrder,
  MarketItem,
  MarketItemFilters,
  MarketItemStatus,
  MarketOrderFilters,
  MarketOrderStatus,
} from '@/types/market'

// ============================================
// 商品管理
// ============================================

export async function getAdminMarketItems(
  filters?: MarketItemFilters
): Promise<{ items: MarketItem[]; error?: string }> {
  try {
    const client = await getAdminClient()
    let query = client.from('market_items').select('*').order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) return { items: [], error: error.message }
    return { items: (data || []) as MarketItem[] }
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : 'Unauthorized' }
  }
}

export async function createMarketItem(
  input: CreateMarketItemInput
): Promise<{ item?: MarketItem; error?: string }> {
  const parsed = createMarketItemSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || 'Validation failed' }
  }

  try {
    const client = await getAdminClient()

    const { data, error } = await client
      .from('market_items')
      .insert({ ...parsed.data, status: 'draft' })
      .select()
      .single()

    if (error) return { error: error.message }

    logger.info('MARKET:ADMIN', 'Item created', { id: data.id })
    return { item: data as MarketItem }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed' }
  }
}

const ALLOWED_ITEM_UPDATE_FIELDS = [
  'title_i18n',
  'fixed_price',
  'currency',
  'stock_quantity',
  'status',
] as const

export async function updateMarketItem(
  id: number,
  updates: Partial<MarketItem>
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getAdminClient()

    const safeUpdates: Record<string, unknown> = {}
    for (const key of ALLOWED_ITEM_UPDATE_FIELDS) {
      if (key in updates) {
        safeUpdates[key] = updates[key as keyof MarketItem]
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return { success: false, error: 'No valid fields to update' }
    }

    // 状态转换验证 + 乐观锁（对齐 updateMarketOrderStatus 模式）
    let currentStatus: MarketItemStatus | null = null
    if ('status' in safeUpdates) {
      const { data: item } = await client
        .from('market_items')
        .select('status')
        .eq('id', id)
        .single()

      if (!item) return { success: false, error: 'Item not found' }

      currentStatus = item.status as MarketItemStatus
      const newStatus = safeUpdates.status as MarketItemStatus

      if (!isValidItemTransition(currentStatus, newStatus)) {
        return { success: false, error: `Invalid transition: ${currentStatus} → ${newStatus}` }
      }
    }

    let query = client.from('market_items').update(safeUpdates).eq('id', id)
    if (currentStatus) {
      query = query.eq('status', currentStatus)
    }
    const { data, error } = await query.select('id')

    if (error) return { success: false, error: error.message }
    if (currentStatus && (!data || data.length === 0)) {
      return {
        success: false,
        error: 'Item status has changed (concurrent modification). Please refresh and retry.',
      }
    }

    logger.info('MARKET:ADMIN', 'Item updated', { id })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

export async function deleteMarketItem(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getAdminClient()

    // 原子操作：仅删除 draft 状态的商品，避免 TOCTOU 竞态
    const { data, error } = await client
      .from('market_items')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')
      .select('id')

    if (error) return { success: false, error: error.message }
    if (!data || data.length === 0) {
      return { success: false, error: 'Item not found or not in draft status' }
    }

    logger.info('MARKET:ADMIN', 'Item deleted', { id })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

// ============================================
// 订单管理
// ============================================

export async function getAdminMarketOrders(
  filters?: MarketOrderFilters
): Promise<{ orders: AdminMarketOrder[]; error?: string }> {
  try {
    const client = await getAdminClient()
    let query = client
      .from('market_orders')
      .select('*, market_items(title_i18n)')
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.buyer_email) query = query.eq('buyer_email', filters.buyer_email)
    if (filters?.item_id) query = query.eq('item_id', filters.item_id)

    const { data, error } = await query
    if (error) return { orders: [], error: error.message }
    return { orders: (data || []) as AdminMarketOrder[] }
  } catch (err) {
    return { orders: [], error: err instanceof Error ? err.message : 'Unauthorized' }
  }
}

export async function updateMarketOrderStatus(
  orderId: number,
  newStatus: MarketOrderStatus,
  meta?: { tracking_number?: string; tracking_carrier?: string; note?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    // P2-2: 输入验证
    const parsed = updateOrderStatusSchema.safeParse({
      order_id: orderId,
      status: newStatus,
      tracking_number: meta?.tracking_number,
      tracking_carrier: meta?.tracking_carrier,
      note: meta?.note,
    })
    if (!parsed.success) {
      return { success: false, error: 'Invalid input' }
    }

    const client = await getAdminClient()

    const { data: order } = await client
      .from('market_orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (!order) return { success: false, error: 'Order not found' }

    const currentStatus = order.status as MarketOrderStatus

    if (!isValidOrderTransition(currentStatus, newStatus)) {
      return { success: false, error: `Invalid transition: ${currentStatus} → ${newStatus}` }
    }

    if (needsTrackingNumber(currentStatus, newStatus) && !meta?.tracking_number) {
      return { success: false, error: 'Tracking number required for shipping' }
    }

    // 检查文件上传要求（先上传文件，后转换状态）
    if (needsFileUpload(currentStatus, newStatus)) {
      const category = getFileCategory(currentStatus, newStatus)
      if (category) {
        const files = await getMarketOrderFiles(orderId, category)
        const imageFiles = files.filter((f) => f.contentType.startsWith('image/'))
        if (imageFiles.length === 0) {
          const label = category === 'shipping' ? 'shipping proof' : 'fund usage proof'
          return {
            success: false,
            error: `At least one image is required as ${label} before this transition`,
          }
        }
      }
    }

    const updateData: Record<string, any> = { status: newStatus }
    if (meta?.tracking_number) updateData.tracking_number = meta.tracking_number
    if (meta?.tracking_carrier) updateData.tracking_carrier = meta.tracking_carrier

    // 乐观锁：.eq('status', currentStatus) 确保 webhook 或其他 admin 未在期间改变状态
    // 对齐同文件 deleteMarketItem 的原子化模式
    const { data, error } = await client
      .from('market_orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('status', currentStatus)
      .select('id')

    if (error) return { success: false, error: error.message }
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Order status has changed (concurrent modification). Please refresh and retry.',
      }
    }

    logger.info('MARKET:ADMIN', 'Order status updated', {
      orderId,
      from: currentStatus,
      to: newStatus,
    })

    // ── 发送状态变更邮件（shipped / completed） ──────────
    if (newStatus === 'shipped' || newStatus === 'completed') {
      try {
        const { data: fullOrder } = await client
          .from('market_orders')
          .select(
            'order_reference, buyer_email, shipping_name, shipping_city, shipping_country, quantity, total_amount, currency, locale, tracking_number, tracking_carrier, market_items(title_i18n)'
          )
          .eq('id', orderId)
          .single()

        if (fullOrder && fullOrder.buyer_email) {
          const locale = (fullOrder.locale || 'en') as import('@/lib/email/types').Locale
          const linkedItem = Array.isArray(fullOrder.market_items)
            ? fullOrder.market_items[0]
            : fullOrder.market_items
          const itemTitleI18n = (linkedItem?.title_i18n as Record<string, string>) || {
            en: '',
            zh: '',
            ua: '',
          }

          if (newStatus === 'shipped') {
            const shippingFiles = await getMarketOrderFiles(orderId, 'shipping')
            const proofImageUrls = shippingFiles
              .filter((f) => f.contentType.startsWith('image/'))
              .map((f) => f.publicUrl)

            const { sendMarketOrderShippedEmail } = await import('@/lib/email')
            await sendMarketOrderShippedEmail({
              to: fullOrder.buyer_email,
              locale,
              shippingName: fullOrder.shipping_name,
              orderReference: fullOrder.order_reference,
              itemTitleI18n,
              quantity: fullOrder.quantity,
              totalAmount: Number(fullOrder.total_amount),
              currency: fullOrder.currency,
              shippingCity: fullOrder.shipping_city,
              shippingCountry: fullOrder.shipping_country,
              trackingNumber: fullOrder.tracking_number || meta?.tracking_number || '',
              trackingCarrier: fullOrder.tracking_carrier || meta?.tracking_carrier,
              proofImageUrls,
            })
          } else {
            const completionFiles = await getMarketOrderFiles(orderId, 'completion')
            const proofImageUrls = completionFiles
              .filter((f) => f.contentType.startsWith('image/'))
              .map((f) => f.publicUrl)

            const { sendMarketOrderCompletedEmail } = await import('@/lib/email')
            await sendMarketOrderCompletedEmail({
              to: fullOrder.buyer_email,
              locale,
              shippingName: fullOrder.shipping_name,
              orderReference: fullOrder.order_reference,
              itemTitleI18n,
              quantity: fullOrder.quantity,
              totalAmount: Number(fullOrder.total_amount),
              currency: fullOrder.currency,
              shippingCity: fullOrder.shipping_city,
              shippingCountry: fullOrder.shipping_country,
              proofImageUrls,
            })
          }

          logger.info('MARKET:ADMIN', `Order ${newStatus} email sent`, { orderId })
        }
      } catch (emailError) {
        logger.error('MARKET:ADMIN', `Failed to send ${newStatus} email (non-blocking)`, {
          orderId,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        })
      }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}
