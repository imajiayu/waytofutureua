'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { ITEM_STATUS_COLORS } from '@/lib/market/market-status'
import type { PublicMarketItem } from '@/types/market'

interface MarketItemCardProps {
  item: PublicMarketItem
}

export default function MarketItemCard({ item }: MarketItemCardProps) {
  const t = useTranslations('market')
  const locale = useLocale() as SupportedLocale
  const router = useRouter()

  const title = getTranslatedText(item.title_i18n, locale) || 'Untitled'
  const colors = ITEM_STATUS_COLORS[item.status]

  const handleClick = () => {
    router.push(`/market/${item.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className="w-full text-left bg-white rounded-xl border border-gray-200 shadow-sm
               hover:shadow-md hover:border-gray-300 transition-all duration-200
               overflow-hidden group focus:outline-none focus:ring-2 focus:ring-ukraine-blue-500"
    >
      {/* 图片 */}
      {/* TODO: 图片将从静态 JSON 文件获取，暂时使用占位符 */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        {/* 类型标签 */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-ukraine-blue-100 text-ukraine-blue-700">
            {t('sale.label')}
          </span>
        </div>

        {/* 状态标签 */}
        {colors && item.status !== 'on_sale' && (
          <div className="absolute top-3 right-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
              {t(`status.${item.status}`)}
            </span>
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="p-4 space-y-3">
        <h3 className="text-base font-bold text-gray-900 line-clamp-2 font-display">
          {title}
        </h3>

        {/* 义卖信息 */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500">{t('sale.price')}</span>
            <span className="text-lg font-bold text-ukraine-blue-600 font-data">
              {formatMarketPrice(item.fixed_price || 0, item.currency)}
            </span>
          </div>

          <div className="text-sm text-gray-500">
            {item.stock_quantity !== null && item.stock_quantity > 0
              ? t('sale.inStock', { count: item.stock_quantity })
              : <span className="text-warm-600 font-medium">{t('sale.outOfStock')}</span>
            }
          </div>
        </div>
      </div>
    </button>
  )
}
