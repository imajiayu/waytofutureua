import type { I18nText } from './index'

// ============================================
// 1. 枚举常量
// ============================================

/** 商品状态 */
export const MARKET_ITEM_STATUSES = ['draft', 'on_sale', 'off_shelf'] as const
export type MarketItemStatus = typeof MARKET_ITEM_STATUSES[number]

/** 订单状态 */
export const MARKET_ORDER_STATUSES = [
  'pending', 'widget_load_failed', 'paid', 'shipped', 'completed',
  'expired', 'declined',
] as const
export type MarketOrderStatus = typeof MARKET_ORDER_STATUSES[number]

// ============================================
// 2. 收货地址
// ============================================

export interface ShippingAddress {
  name: string
  address_line1: string
  address_line2?: string
  city: string
  state?: string
  postal_code: string
  country: string
}

// ============================================
// 3. 数据库表类型
// ============================================

/** market_items — 商品主表 */
export interface MarketItem {
  id: number
  title_i18n: I18nText
  fixed_price: number
  currency: string
  stock_quantity: number
  status: MarketItemStatus
  created_at: string
  updated_at: string
}

/** market_orders — 订单表 */
export interface MarketOrder {
  id: number
  order_reference: string

  // 买家
  buyer_id: string
  buyer_email: string

  // 商品
  item_id: number
  quantity: number
  unit_price: number
  total_amount: number

  // 支付
  payment_method: string

  // 收货地址
  shipping_name: string
  shipping_address_line1: string
  shipping_address_line2: string | null
  shipping_city: string
  shipping_state: string | null
  shipping_postal_code: string
  shipping_country: string

  // 物流
  tracking_number: string | null
  tracking_carrier: string | null

  // 状态 & 元数据
  status: MarketOrderStatus
  locale: string
  created_at: string
  updated_at: string
}

/** market_order_status_history — 订单状态历史 */
export interface MarketOrderStatusHistory {
  id: number
  order_id: number
  from_status: MarketOrderStatus | null
  to_status: MarketOrderStatus
  changed_at: string
}

/** 管理员订单（含商品标题 join） */
export interface AdminMarketOrder extends MarketOrder {
  market_items: { title_i18n: I18nText } | null
}

// ============================================
// 4. 公开视图类型
// ============================================

/** 公开商品（与 MarketItem 相同，未来扩展时可 Omit 敏感字段） */
export type PublicMarketItem = MarketItem

// ============================================
// 5. 静态内容类型（JSON 文件）
// ============================================

/** 商品静态内容（来自 public/content/market/item-{id}-{locale}.json） */
export interface MarketItemContent {
  images: {
    card: string
    detail: string
  }
  description: string[]
}

// ============================================
// 6. 筛选 & 表单类型
// ============================================

export interface MarketItemFilters {
  status?: MarketItemStatus
  search?: string
}

export interface MarketOrderFilters {
  status?: MarketOrderStatus
  buyer_email?: string
  item_id?: number
}

// ============================================
// 7. 文件相关类型
// ============================================

/** 订单文件分类 */
export type MarketOrderFileCategory = 'shipping' | 'completion'

/** 订单文件对象 */
export interface MarketOrderFile {
  name: string
  path: string
  publicUrl: string
  size: number
  contentType: string
  createdAt: string
  updatedAt: string
  category: MarketOrderFileCategory
}

// ============================================
// 8. 视图 & 公开记录类型
// ============================================

/** 公开购买记录（邮箱脱敏） */
export interface PublicMarketOrderRecord {
  order_reference: string
  buyer_email_masked: string
  quantity: number
  total_amount: number
  status: string
  created_at: string
}
