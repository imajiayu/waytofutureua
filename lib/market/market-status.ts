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

/** 已售（在售但库存为 0）的展示颜色 */
const SOLD_COLORS = { bg: 'bg-warm-100', text: 'text-warm-700' } as const

/**
 * 商品 UI 展示信息（单一数据源）
 *
 * 数据库 status 只有 draft/on_sale/off_shelf，
 * 但 UI 需要派生出第四种展示状态 "sold"（在售 + 库存为 0）。
 *
 * @returns labelKey  — 翻译键，直接传给 t()
 * @returns colors    — { bg, text } Tailwind class
 * @returns hasStock  — 是否有库存
 * @returns isSold    — 是否已售罄
 */
export function getItemDisplayInfo(
  status: MarketItemStatus,
  stockQuantity: number | null,
) {
  const isOnSale = status === 'on_sale'
  const hasStock = isOnSale && stockQuantity !== null && stockQuantity > 0
  const isSold = isOnSale && (!stockQuantity || stockQuantity <= 0)

  return {
    labelKey: isSold ? 'sale.sold' : `status.${status}` as const,
    colors: isSold ? SOLD_COLORS : ITEM_STATUS_COLORS[status],
    hasStock,
    isSold,
  }
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
// 3b. Webhook 可更新的源状态（对齐捐赠系统 PAYMENT_WEBHOOK_SOURCE_STATUSES 模式）
// ============================================

/** 支付 Webhook 可更新的源状态 — widget_load_failed 和 expired（cron 清理后）也可被 webhook 恢复为 paid */
export const MARKET_WEBHOOK_SOURCE_STATUSES: readonly MarketOrderStatus[] = [
  'pending', 'widget_load_failed', 'expired'
] as const

// ============================================
// 4. 订单状态分组（成功页展示）
// ============================================

export type OrderStatusGroup = 'processing' | 'success' | 'failed'

const FAILED_ORDER_STATUSES: MarketOrderStatus[] = ['expired', 'declined']
const SUCCESS_ORDER_STATUSES: MarketOrderStatus[] = ['paid', 'shipped', 'completed']

/** 获取订单状态所属的分组（用于成功页显示） */
export function getOrderStatusGroup(status: MarketOrderStatus): OrderStatusGroup {
  if (FAILED_ORDER_STATUSES.includes(status)) return 'failed'
  if (SUCCESS_ORDER_STATUSES.includes(status)) return 'success'
  return 'processing'
}

// ============================================
// 5. 判断函数
// ============================================

export function canPurchase(status: MarketItemStatus): boolean {
  return status === 'on_sale'
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

export function isValidItemTransition(from: MarketItemStatus, to: MarketItemStatus): boolean {
  return ITEM_ADMIN_TRANSITIONS[from]?.includes(to) ?? false
}

/** 订单状态转换是否需要快递单号（paid → shipped） */
export function needsTrackingNumber(from: MarketOrderStatus, to: MarketOrderStatus): boolean {
  return from === 'paid' && to === 'shipped'
}

// ============================================
// 5. 文件上传相关
// ============================================

export type MarketOrderFileCategory = 'shipping' | 'completion'

/** 状态转换是否需要文件上传 */
export function needsFileUpload(from: MarketOrderStatus, to: MarketOrderStatus): boolean {
  return (from === 'paid' && to === 'shipped') || (from === 'shipped' && to === 'completed')
}

/** 获取当前转换对应的文件分类 */
export function getFileCategory(from: MarketOrderStatus, to: MarketOrderStatus): MarketOrderFileCategory | null {
  if (from === 'paid' && to === 'shipped') return 'shipping'
  if (from === 'shipped' && to === 'completed') return 'completion'
  return null
}

/** 是否可以管理已上传的文件（shipped/completed 状态） */
export function canManageOrderFiles(status: MarketOrderStatus): boolean {
  return status === 'shipped' || status === 'completed'
}
