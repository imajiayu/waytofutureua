'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback } from 'react'

import { useRouter } from '@/i18n/navigation'
import { formatDate, getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import { getItemDisplayInfo } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { MarketItemContent, PublicMarketItem } from '@/types/market'

interface MarketItemCardProps {
  item: PublicMarketItem
  content: MarketItemContent | null
  onNavigate?: () => void // P3-3: 由 Grid 层统一管理加载态
}

export default function MarketItemCard({ item, content, onNavigate }: MarketItemCardProps) {
  const t = useTranslations('market')
  const locale = useLocale() as SupportedLocale
  const router = useRouter()

  const title = getTranslatedText(item.title_i18n, null, locale) || 'Untitled'
  const { labelKey, colors, hasStock, isSold } = getItemDisplayInfo(
    item.status,
    item.stock_quantity
  )
  const isOnSale = item.status === 'on_sale'

  const handleClick = useCallback(() => {
    onNavigate?.()
    router.push(`/market/${item.id}`)
  }, [router, item.id, onNavigate])

  return (
    <div
      onClick={handleClick}
      role="link"
      aria-label={title}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className="hover:shadow-ukraine-blue-500/8 group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white text-left transition-all duration-300 hover:border-ukraine-blue-300/50 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ukraine-blue-500/40 focus:ring-offset-2"
    >
      {/* 图片区域 */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-50">
        {content?.images.card ? (
          <Image
            src={content.images.card}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* 左上角状态标签 */}
        <div className="absolute left-3 top-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colors.bg} ${colors.text} shadow-sm`}
          >
            {t(labelKey)}
          </span>
        </div>

        {/* 底部渐变 — 衔接图片和内容 */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/60 to-transparent" />
      </div>

      {/* 内容区域 */}
      <div className="flex flex-1 flex-col gap-3 p-4 pb-3">
        {/* 标题 */}
        <h3 className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-gray-900 transition-colors duration-200 group-hover:text-ukraine-blue-600">
          {title}
        </h3>

        {/* 价格 + 库存 */}
        <div className="flex items-end justify-between gap-2">
          <span className="font-data text-xl font-bold leading-none tracking-tight text-ukraine-blue-600">
            {formatMarketPrice(item.fixed_price || 0, item.currency)}
          </span>

          {/* 库存指示器 */}
          <span className="flex items-center gap-1 pb-0.5 text-xs leading-none text-gray-500">
            {hasStock ? (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-life-500" />
                {t('sale.inStock', { count: item.stock_quantity })}
              </>
            ) : isSold ? (
              <>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-warm-400" />
                <span className="font-medium text-warm-600">{t(labelKey)}</span>
              </>
            ) : (
              <span className="font-medium text-gray-400">{t(labelKey)}</span>
            )}
          </span>
        </div>

        {/* 上架日期 */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <svg
            className="h-3.5 w-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
            />
          </svg>
          <span>
            {t('sale.listedOn')} {formatDate(item.created_at, locale)}
          </span>
        </div>
      </div>

      {/* CTA 按钮 — 所有状态均可点击 */}
      <div className="px-4 pb-4">
        {isOnSale && hasStock ? (
          <div className="relative w-full overflow-hidden rounded-xl bg-ukraine-gold-400 py-2.5 text-center text-sm font-bold tracking-wide text-ukraine-blue-900 transition-all duration-300 group-hover:bg-ukraine-gold-500 group-hover:shadow-md group-hover:shadow-ukraine-gold-400/20">
            <div className="absolute inset-0 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {t('sale.viewDetails')}
              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </div>
        ) : (
          <div className="w-full rounded-xl bg-ukraine-blue-50 py-2.5 text-center text-sm font-semibold text-ukraine-blue-600 transition-colors duration-200 group-hover:bg-ukraine-blue-100">
            <span className="flex items-center justify-center gap-1.5">
              {t('sale.viewDetails')}
              <svg
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
