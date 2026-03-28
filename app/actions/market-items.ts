'use server'

import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { MarketItem, PublicMarketItem, MarketItemFilters } from '@/types/market'

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

    return { items: (data || []) as PublicMarketItem[] }
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
