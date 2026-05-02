'use server'

import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server'
import type { BuyerMarketOrder } from '@/types/dtos'

export type { BuyerMarketOrder }

/** 获取当前认证用户的所有订单 */
export async function getMyOrders(): Promise<{
  orders: BuyerMarketOrder[]
  error?: string
}> {
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

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
