'use server'

import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { MarketItem, PublicMarketItem, PublicMarketOrderRecord, MarketItemFilters } from '@/types/market'

// ============================================
// 公开数据获取（无需认证）
// ============================================

/** 获取公开商品列表（排除 draft） */
export async function getPublicMarketItems(
  filters?: MarketItemFilters
): Promise<{ items: PublicMarketItem[]; error?: string }> {
  try {
    const supabase = await createServerClient()

    let query = supabase
      .from('market_items')
      .select('*')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('MARKET:ITEMS', 'Failed to fetch items', { error: error.message })
      return { items: [], error: error.message }
    }

    // 排序：on_sale 有货 → on_sale 售罄 → off_shelf，同组按创建时间倒序
    const sorted = ((data || []) as PublicMarketItem[]).sort((a, b) => {
      const priority = (item: PublicMarketItem) => {
        if (item.status === 'on_sale' && item.stock_quantity !== null && item.stock_quantity > 0) return 0
        if (item.status === 'on_sale') return 1
        return 2 // off_shelf
      }
      return priority(a) - priority(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return { items: sorted }
  } catch (err) {
    logger.error('MARKET:ITEMS', 'Unexpected error', { error: err instanceof Error ? err.message : String(err) })
    return { items: [], error: 'Failed to load items' }
  }
}

/** 获取单个商品详情 */
export async function getMarketItemById(
  id: number
): Promise<{ item: PublicMarketItem | null; error?: string }> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('market_items')
      .select('*')
      .eq('id', id)
      .neq('status', 'draft')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { item: null, error: 'not_found' }
      }
      logger.error('MARKET:ITEMS', 'Failed to fetch item', { id, error: error.message })
      return { item: null, error: error.message }
    }

    return { item: data as PublicMarketItem }
  } catch (err) {
    logger.error('MARKET:ITEMS', 'Unexpected error', { error: err instanceof Error ? err.message : String(err) })
    return { item: null, error: 'Failed to load item' }
  }
}

/** 获取商品的公开购买记录（通过 market_orders_public 视图，邮箱已在 SQL 层脱敏） */
export async function getPublicMarketOrders(
  itemId: number
): Promise<{ orders: PublicMarketOrderRecord[]; error?: string }> {
  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('market_orders_public')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('MARKET:ITEMS', 'Failed to fetch public orders', { itemId, error: error.message })
      return { orders: [], error: error.message }
    }

    // 映射视图字段到前端类型（视图字段均为 nullable，业务逻辑保证 WHERE 过滤后非空）
    const orders: PublicMarketOrderRecord[] = (data || []).map((d) => ({
      order_reference: d.order_reference!,
      buyer_email_masked: d.buyer_email_obfuscated ?? '***',
      quantity: d.quantity!,
      total_amount: d.total_amount!,
      currency: d.currency || 'USD',
      status: d.status!,
      shipping_country: d.shipping_country!,
      created_at: d.created_at!,
      updated_at: d.updated_at!,
    }))

    return { orders }
  } catch (err) {
    logger.error('MARKET:ITEMS', 'Unexpected error fetching orders', { error: err instanceof Error ? err.message : String(err) })
    return { orders: [], error: 'Failed to load purchase records' }
  }
}
