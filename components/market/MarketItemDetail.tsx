'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import { ITEM_STATUS_COLORS } from '@/lib/market/market-status'
import { useMarketItemContent } from '@/lib/hooks/useMarketItemContent'
import type { PublicMarketItem } from '@/types/market'
import SaleCheckoutPanel from './SaleCheckoutPanel'
import MarketOrderList from './MarketOrderList'

interface MarketItemDetailProps {
  item: PublicMarketItem
  locale: string
}

export default function MarketItemDetail({ item, locale }: MarketItemDetailProps) {
  const t = useTranslations('market')
  const title = getTranslatedText(item.title_i18n, null, locale as SupportedLocale) || 'Untitled'
  const colors = ITEM_STATUS_COLORS[item.status]
  const { data: content, loading } = useMarketItemContent(item.id, locale)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* 左侧：图片 */}
      <div className="space-y-4">
        <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
          {content?.images.detail ? (
            <Image
              src={content.images.detail}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              {loading ? (
                <div className="w-10 h-10 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
              ) : (
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          )}

          {/* 状态标签 */}
          {colors && (
            <div className="absolute top-4 left-4">
              <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${colors.bg} ${colors.text}`}>
                {t(`status.${item.status}`)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：信息 + 操作 */}
      <div className="space-y-6">
        {/* 标题 */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">
          {title}
        </h1>

        {/* 描述 */}
        {content?.description && content.description.length > 0 && (
          <div className="space-y-3 text-gray-600 leading-relaxed">
            {content.description.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}

        {/* 义卖操作面板 */}
        <SaleCheckoutPanel item={item} locale={locale} />
      </div>

      {/* 购买记录（跨两栏全宽） */}
      <div className="lg:col-span-2">
        <MarketOrderList itemId={item.id} />
      </div>
    </div>
  )
}
