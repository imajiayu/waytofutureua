import type { MarketOrderFileCategory } from '@/types/market'

/** 凭证类别的稳定遍历顺序（管理员上架 → 完成的物流时序） */
export const MARKET_ORDER_CATEGORIES: MarketOrderFileCategory[] = ['shipping', 'completion']

/** 凭证类别在 admin 后台 / 上传 UI 的展示名（admin 端，全英文） */
export const MARKET_ORDER_CATEGORY_LABELS: Record<MarketOrderFileCategory, string> = {
  shipping: 'Shipping Proof',
  completion: 'Fund Usage Proof',
}
