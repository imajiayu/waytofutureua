'use server'

import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { MarketOrder } from '@/types/market'
import type { I18nText } from '@/types'

/** 买家订单（含商品标题 join） */
export type BuyerMarketOrder = MarketOrder & {
  market_items: { title_i18n: I18nText } | null
}

/** 获取当前认证用户的所有订单 */
export async function getMyOrders(): Promise<{
  orders: BuyerMarketOrder[]
  error?: string
}> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { orders: [], error: 'not_authenticated' }
  }

  const { data, error } = await supabase
    .from('market_orders')
    .select('*, market_items(title_i18n)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('MARKET:ORDER', 'Fetch orders failed', { error: error.message })
    return { orders: [], error: error.message }
  }

  return { orders: (data || []) as BuyerMarketOrder[] }
}

/** 获取单个订单详情 */
export async function getOrderDetail(
  orderReference: string
): Promise<{ order: MarketOrder | null; error?: string }> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { order: null, error: 'not_authenticated' }
  }

  const { data, error } = await supabase
    .from('market_orders')
    .select('*')
    .eq('order_reference', orderReference)
    .eq('buyer_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return { order: null, error: 'not_found' }
    return { order: null, error: error.message }
  }

  return { order: data as MarketOrder }
}
