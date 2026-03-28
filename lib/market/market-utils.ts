// ============================================
// 义卖市场工具函数
// ============================================

/** 格式化金额显示（如 $25.00） */
export function formatMarketPrice(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
