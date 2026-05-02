import { z } from 'zod'

import { MARKET_ORDER_STATUSES } from '@/types/market'

// ============================================
// 共享规则
// ============================================

const i18nTextSchema = z
  .object({
    en: z.string().optional(),
    zh: z.string().optional(),
    ua: z.string().optional(),
  })
  .refine((data) => data.en || data.zh || data.ua, {
    message: 'At least one language is required',
  })

export const shippingAddressSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z
    .string()
    .max(30)
    .refine((val) => val.replace(/\D/g, '').length >= 7, 'Valid phone number is required'),
  address_line1: z.string().min(5, 'Address must be at least 5 characters').max(200),
  address_line2: z.string().max(200).optional(),
  city: z.string().min(2, 'City must be at least 2 characters').max(100),
  state: z.string().max(100).optional(),
  postal_code: z.string().min(3, 'Postal code must be at least 3 characters').max(20),
  country: z.string().min(2, 'Country is required').max(2),
})

// ============================================
// 义卖购买
// ============================================

export const salePurchaseSchema = z.object({
  item_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  shipping: shippingAddressSchema,
})

// ============================================
// 管理员：创建商品
// ============================================

export const createMarketItemSchema = z.object({
  title_i18n: i18nTextSchema,
  currency: z.string().default('USD'),
  fixed_price: z.number().positive('Price must be positive'),
  stock_quantity: z.number().int().min(1, 'Stock must be at least 1'),
})

export type CreateMarketItemInput = z.infer<typeof createMarketItemSchema>

// ============================================
// 管理员：更新订单状态
// ============================================

export const updateOrderStatusSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(MARKET_ORDER_STATUSES),
  tracking_number: z.string().max(100).optional(),
  tracking_carrier: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})
