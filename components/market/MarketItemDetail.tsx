'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
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
    <div>
      {/* ─── Breadcrumb ─── */}
      <nav className="mkt-rise mb-8 sm:mb-10">
        <Link
          href="/market"
          className="group inline-flex items-center gap-2.5 text-sm text-gray-400
                     hover:text-ukraine-blue-500 transition-colors duration-200"
        >
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1"
            fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <span className="tracking-wide">{t('title')}</span>
        </Link>
      </nav>

      {/* ─── Main: Image + Info (2-column on desktop) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">

        {/* ━━ Left: Gallery Frame with Status Ribbon ━━ */}
        <div className="lg:col-span-7 mkt-rise" style={{ animationDelay: '0.06s' }}>
          <div className="relative">
            {/* Outer frame — warm mat board + subtle shadow */}
            <div
              className="bg-[#FAFAF7] p-2.5 sm:p-4
                         shadow-[0_2px_36px_-8px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.04)]
                         ring-1 ring-stone-200/70 rounded-[2px]"
            >
              {/* Inner: artwork image */}
              <div className="relative aspect-square overflow-hidden bg-stone-100 ring-1 ring-black/[0.04]">
                {content?.images.detail ? (
                  <Image
                    src={content.images.detail}
                    alt={title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-300">
                    {loading ? (
                      <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-500 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ━━ Right: Info + Checkout ━━ */}
        <div className="lg:col-span-5 flex flex-col gap-7 lg:pt-2">

          {/* Title block */}
          <div className="mkt-rise" style={{ animationDelay: '0.14s' }}>
            <h1
              className="text-[1.7rem] sm:text-[2rem] lg:text-[2.2rem]
                         font-bold text-gray-900 font-display leading-[1.18] tracking-tight"
            >
              {title}
              {colors && (
                <span
                  className={`inline-flex items-center align-[0.12em] ml-2
                             px-3 py-1 text-sm font-semibold
                             rounded-full shadow-sm
                             ${colors.bg} ${colors.text}`}
                >
                  {t(`status.${item.status}`)}
                </span>
              )}
            </h1>

            {/* Gold accent rule — gallery placard style */}
            <div className="mt-4 flex items-center gap-0">
              <div className="h-[2px] w-10 bg-ukraine-gold-400 rounded-full" />
              <div className="h-[2px] w-6 bg-ukraine-gold-300/50 rounded-full" />
            </div>
          </div>

          {/* Description */}
          {content?.description && content.description.length > 0 && (
            <div className="mkt-rise space-y-3" style={{ animationDelay: '0.22s' }}>
              {content.description.map((paragraph, i) => (
                <p key={i} className="text-[15px] text-gray-500 leading-[1.75]">
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {/* Checkout panel */}
          <div className="mkt-rise" style={{ animationDelay: '0.28s' }}>
            <SaleCheckoutPanel item={item} locale={locale} />
          </div>
        </div>
      </div>

      {/* ─── Purchase History ─── */}
      <div className="mt-14 lg:mt-20 mkt-rise" style={{ animationDelay: '0.38s' }}>
        <MarketOrderList itemId={item.id} />
      </div>
    </div>
  )
}
