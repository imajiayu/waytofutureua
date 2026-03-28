// ============================================
// 义卖市场状态工具库
// 单一数据源：状态定义、分组、转换规则、判断函数
// ============================================

import type { MarketItemStatus, MarketOrderStatus } from '@/types/market'

// ============================================
// 1. 商品状态转换（管理员）
// ============================================

export const ITEM_ADMIN_TRANSITIONS: Partial<Record<MarketItemStatus, MarketItemStatus[]>> = {
  draft:     ['on_sale'],
  on_sale:   ['off_shelf'],
  off_shelf: ['on_sale'],
}

// ============================================
// 2. 订单状态转换（管理员）
// ============================================

export const ORDER_ADMIN_TRANSITIONS: Record<MarketOrderStatus, MarketOrderStatus[]> = {
  pending:             [],
  widget_load_failed:  [],
  paid:                ['shipped'],
  shipped:             ['completed'],
  completed:           [],
  expired:             [],
  declined:            [],
}

// ============================================
// 3. 状态颜色（UI）
// ============================================

export const ITEM_STATUS_COLORS: Record<MarketItemStatus, { bg: string; text: string }> = {
  draft:     { bg: 'bg-gray-100',   text: 'text-gray-600' },
  on_sale:   { bg: 'bg-life-100',   text: 'text-life-800' },
  off_shelf: { bg: 'bg-gray-100',   text: 'text-gray-600' },
}

export const ORDER_STATUS_COLORS: Record<MarketOrderStatus, { bg: string; text: string }> = {
  pending:            { bg: 'bg-ukraine-gold-100', text: 'text-ukraine-gold-800' },
  widget_load_failed: { bg: 'bg-warm-100',         text: 'text-warm-800' },
  paid:               { bg: 'bg-life-100',         text: 'text-life-800' },
  shipped:            { bg: 'bg-ukraine-blue-100', text: 'text-ukraine-blue-700' },
  completed:          { bg: 'bg-life-100',         text: 'text-life-800' },
  expired:            { bg: 'bg-gray-100',         text: 'text-gray-600' },
  declined:           { bg: 'bg-warm-100',         text: 'text-warm-800' },
}

// ============================================
// 4. 判断函数
// ============================================

export function canPurchase(status: MarketItemStatus): boolean {
  return status === 'on_sale'
}

export function isOrderPaid(status: MarketOrderStatus): boolean {
  return ['paid', 'shipped', 'completed'].includes(status)
}

export function isOrderTerminal(status: MarketOrderStatus): boolean {
  return ['completed', 'expired', 'declined'].includes(status)
}

export function getNextOrderStatuses(status: MarketOrderStatus): MarketOrderStatus[] {
  return ORDER_ADMIN_TRANSITIONS[status] || []
}

export function isValidOrderTransition(from: MarketOrderStatus, to: MarketOrderStatus): boolean {
  return ORDER_ADMIN_TRANSITIONS[from]?.includes(to) ?? false
}

export function getNextItemStatuses(status: MarketItemStatus): MarketItemStatus[] {
  return ITEM_ADMIN_TRANSITIONS[status] || []
}

/** 订单状态转换是否需要快递单号（paid → shipped） */
export function needsTrackingNumber(from: MarketOrderStatus, to: MarketOrderStatus): boolean {
  return from === 'paid' && to === 'shipped'
}
