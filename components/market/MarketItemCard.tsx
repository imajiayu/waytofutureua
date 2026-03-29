'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { getTranslatedText, formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { getItemDisplayInfo } from '@/lib/market/market-status'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import type { PublicMarketItem, MarketItemContent } from '@/types/market'

interface MarketItemCardProps {
  item: PublicMarketItem
  content: MarketItemContent | null
}

export default function MarketItemCard({ item, content }: MarketItemCardProps) {
  const t = useTranslations('market')
  const locale = useLocale() as SupportedLocale
  const router = useRouter()
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const title = getTranslatedText(item.title_i18n, null, locale) || 'Untitled'
  const { labelKey, colors, hasStock, isSold } = getItemDisplayInfo(item.status, item.stock_quantity)
  const isOnSale = item.status === 'on_sale'

  const handleClick = useCallback(() => {
    setIsNavigating(true)
    router.push(`/market/${item.id}`)
  }, [router, item.id])

  return (
    <>
    <GlobalLoadingSpinner isLoading={isNavigating} />
    <div
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      className="w-full text-left bg-white rounded-2xl border border-gray-200/80
               hover:shadow-lg hover:shadow-ukraine-blue-500/8 hover:border-ukraine-blue-300/50
               transition-all duration-300 overflow-hidden group cursor-pointer
               focus:outline-none focus:ring-2 focus:ring-ukraine-blue-500/40 focus:ring-offset-2
               flex flex-col"
    >
      {/* 图片区域 */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        {content?.images.card ? (
          <Image
            src={content.images.card}
            alt={title}
            fill
            className="object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* 左上角状态标签 */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} shadow-sm`}>
            {t(labelKey)}
          </span>
        </div>

        {/* 底部渐变 — 衔接图片和内容 */}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white/60 to-transparent" />
      </div>

      {/* 内容区域 */}
      <div className="p-4 pb-3 flex-1 flex flex-col gap-3">
        {/* 标题 */}
        <h3 className="text-[15px] font-bold text-gray-900 line-clamp-2 leading-snug font-display
                       group-hover:text-ukraine-blue-600 transition-colors duration-200">
          {title}
        </h3>

        {/* 价格 + 库存 */}
        <div className="flex items-end justify-between gap-2">
          <span className="text-xl font-bold text-ukraine-blue-600 font-data tracking-tight leading-none">
            {formatMarketPrice(item.fixed_price || 0, item.currency)}
          </span>

          {/* 库存指示器 */}
          <span className="text-xs text-gray-500 flex items-center gap-1 leading-none pb-0.5">
            {hasStock ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-life-500" />
                {t('sale.inStock', { count: item.stock_quantity })}
              </>
            ) : isSold ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-warm-400" />
                <span className="text-warm-600 font-medium">{t(labelKey)}</span>
              </>
            ) : (
              <span className="text-gray-400 font-medium">{t(labelKey)}</span>
            )}
          </span>
        </div>

        {/* 上架日期 */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span>{t('sale.listedOn')} {formatDate(item.created_at, locale)}</span>
        </div>
      </div>

      {/* CTA 按钮 — 所有状态均可点击 */}
      <div className="px-4 pb-4">
        {isOnSale && hasStock ? (
          <div className="relative w-full text-center py-2.5 bg-ukraine-gold-400 text-ukraine-blue-900
                        rounded-xl text-sm font-bold tracking-wide
                        group-hover:bg-ukraine-gold-500 group-hover:shadow-md group-hover:shadow-ukraine-gold-400/20
                        transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent
                          -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {t('sale.viewDetails')}
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        ) : (
          <div className="w-full text-center py-2.5 bg-ukraine-blue-50 text-ukraine-blue-600
                        rounded-xl text-sm font-semibold
                        group-hover:bg-ukraine-blue-100 transition-colors duration-200">
            <span className="flex items-center justify-center gap-1.5">
              {t('sale.viewDetails')}
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
