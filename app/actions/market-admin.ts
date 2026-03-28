'use server'

import { getAdminClient } from '@/lib/supabase/action-clients'
import { createMarketItemSchema, updateOrderStatusSchema } from '@/lib/market/market-validations'
import type { CreateMarketItemInput } from '@/lib/market/market-validations'
import { isValidOrderTransition, needsTrackingNumber } from '@/lib/market/market-status'
import { logger } from '@/lib/logger'
import type {
  MarketItem, MarketOrder, MarketItemFilters,
  MarketOrderFilters, MarketOrderStatus,
} from '@/types/market'

// ============================================
// 商品管理
// ============================================

export async function getAdminMarketItems(
  filters?: MarketItemFilters
): Promise<{ items: MarketItem[]; error?: string }> {
  try {
    const client = await getAdminClient()
    let query = client
      .from('market_items')
      .select('*')
      .order('created_at', { ascending: false })

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
  'title_i18n', 'fixed_price', 'currency', 'stock_quantity', 'status',
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

    const { error } = await client
      .from('market_items')
      .update(safeUpdates)
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    logger.info('MARKET:ADMIN', 'Item updated', { id })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

export async function publishMarketItem(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getAdminClient()

    const { data: item } = await client
      .from('market_items')
      .select('status')
      .eq('id', id)
      .single()

    if (!item || item.status !== 'draft') {
      return { success: false, error: 'Item not in draft status' }
    }

    const { error } = await client
      .from('market_items')
      .update({ status: 'on_sale' })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    logger.info('MARKET:ADMIN', 'Item published', { id })
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}

export async function cancelMarketItem(
  id: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getAdminClient()

    const { error } = await client
      .from('market_items')
      .update({ status: 'off_shelf' })
      .eq('id', id)
      .in('status', ['on_sale'])

    if (error) return { success: false, error: error.message }

    logger.info('MARKET:ADMIN', 'Item shelved', { id })
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
): Promise<{ orders: MarketOrder[]; error?: string }> {
  try {
    const client = await getAdminClient()
    let query = client
      .from('market_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.buyer_email) query = query.eq('buyer_email', filters.buyer_email)
    if (filters?.item_id) query = query.eq('item_id', filters.item_id)

    const { data, error } = await query
    if (error) return { orders: [], error: error.message }
    return { orders: (data || []) as MarketOrder[] }
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

    const updateData: Record<string, any> = { status: newStatus }
    if (meta?.tracking_number) updateData.tracking_number = meta.tracking_number
    if (meta?.tracking_carrier) updateData.tracking_carrier = meta.tracking_carrier

    const { error } = await client
      .from('market_orders')
      .update(updateData)
      .eq('id', orderId)

    if (error) return { success: false, error: error.message }

    logger.info('MARKET:ADMIN', 'Order status updated', {
      orderId,
      from: currentStatus,
      to: newStatus,
    })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' }
  }
}
