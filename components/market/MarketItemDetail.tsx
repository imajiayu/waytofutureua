'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import { getItemDisplayInfo } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { useMarketItemContent } from '@/lib/hooks/useMarketItemContent'
import type { PublicMarketItem } from '@/types/market'
import SaleCheckoutPanel from './SaleCheckoutPanel'
import MarketOrderList from './MarketOrderList'

const BottomSheet = dynamic(() => import('@/components/common/BottomSheet'), {
  ssr: false,
  loading: () => null,
})

// ── Constants ──
const NAV_HEIGHT = 96       // top-24 = 6rem
const BOTTOM_PADDING = 40
const MOBILE_BREAKPOINT = 1024
const FOOTER_SAFE_ZONE = 150
const SCROLL_DEBOUNCE_MS = 100

interface MarketItemDetailProps {
  item: PublicMarketItem
  locale: string
}

export default function MarketItemDetail({ item, locale }: MarketItemDetailProps) {
  const t = useTranslations('market')
  const title = getTranslatedText(item.title_i18n, null, locale as SupportedLocale) || 'Untitled'
  const { labelKey, colors } = getItemDisplayInfo(item.status, item.stock_quantity)
  const { data: content, loading } = useMarketItemContent(item.id, locale)
  const price = item.fixed_price || 0

  // ── BottomSheet state (mobile) ──
  const [isSheetOpen, setIsSheetOpen] = useState(true)
  const [hideSheetAtBottom, setHideSheetAtBottom] = useState(false)

  // ── Bidirectional sticky sidebar (desktop) ──
  const sidebarRef = useRef<HTMLDivElement>(null)
  const sidebarInnerRef = useRef<HTMLDivElement>(null)
  const [stickyTop, setStickyTop] = useState(NAV_HEIGHT)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let lastScrollY = window.scrollY
    let currentTop = NAV_HEIGHT
    let ticking = false
    let lastSidebarHeight = 0

    const updatePosition = () => {
      const sidebarInner = sidebarInnerRef.current
      if (!sidebarInner || window.innerWidth < MOBILE_BREAKPOINT) {
        setStickyTop(NAV_HEIGHT)
        ticking = false
        return
      }

      const scrollY = window.scrollY
      const scrollDelta = scrollY - lastScrollY
      const viewportHeight = window.innerHeight
      const sidebarHeight = sidebarInner.offsetHeight

      if (Math.abs(sidebarHeight - lastSidebarHeight) > 50) {
        currentTop = NAV_HEIGHT
        lastSidebarHeight = sidebarHeight
      }

      if (sidebarHeight <= viewportHeight - NAV_HEIGHT - BOTTOM_PADDING) {
        setStickyTop(NAV_HEIGHT)
        lastScrollY = scrollY
        ticking = false
        return
      }

      const minTop = viewportHeight - sidebarHeight - BOTTOM_PADDING
      const maxTop = NAV_HEIGHT

      currentTop = currentTop - scrollDelta
      currentTop = Math.max(minTop, Math.min(maxTop, currentTop))

      setStickyTop(currentTop)
      lastScrollY = scrollY
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updatePosition)
        ticking = true
      }
    }

    lastSidebarHeight = sidebarInnerRef.current?.offsetHeight || 0
    updatePosition()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updatePosition)

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updatePosition)
    })
    if (sidebarInnerRef.current) {
      resizeObserver.observe(sidebarInnerRef.current)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updatePosition)
      resizeObserver.disconnect()
    }
  }, [])

  // ── Hide sheet at footer (mobile) ──
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
        setHideSheetAtBottom(distanceFromBottom < FOOTER_SAFE_ZONE)
      }, SCROLL_DEBOUNCE_MS)
    }

    const checkMobileAndAddListener = () => {
      window.removeEventListener('scroll', handleScroll)
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
      } else {
        setHideSheetAtBottom(false)
      }
    }

    checkMobileAndAddListener()
    window.addEventListener('resize', checkMobileAndAddListener)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkMobileAndAddListener)
    }
  }, [])

  // ── Shared sub-components ──

  const imageFrame = (
    <div className="relative">
      <div
        className="bg-[#FAFAF7] p-2.5 sm:p-4
                   shadow-[0_2px_36px_-8px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.04)]
                   ring-1 ring-stone-200/70 rounded-[2px]"
      >
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
  )

  const titleBlock = (
    <div>
      <h1
        className="text-[1.7rem] sm:text-[2rem] lg:text-[2.2rem]
                   font-bold text-gray-900 font-display leading-[1.18] tracking-tight"
      >
        {title}
        <span
          className={`inline-flex items-center align-[0.12em] ml-2
                     px-3 py-1 text-sm font-semibold
                     rounded-full shadow-sm
                     ${colors.bg} ${colors.text}`}
        >
          {t(labelKey)}
        </span>
      </h1>

      {/* Gold accent rule */}
      <div className="mt-4 flex items-center gap-0">
        <div className="h-[2px] w-10 bg-ukraine-gold-400 rounded-full" />
        <div className="h-[2px] w-6 bg-ukraine-gold-300/50 rounded-full" />
      </div>

      {/* Charity policy notice */}
      <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-amber-700/70">
        <svg
          className="w-3.5 h-3.5 mt-[3px] shrink-0 text-amber-600/50"
          fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <span>{t('charityNotice')}</span>
      </p>
    </div>
  )

  const descriptionBlock = content?.description && content.description.length > 0 ? (
    <div className="space-y-3">
      {content.description.map((paragraph, i) => (
        <p key={i} className="text-[15px] text-gray-500 leading-[1.75]">
          {paragraph}
        </p>
      ))}
    </div>
  ) : null

  return (
    <div>
      {/* ─── Main 2-column grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

        {/* ━━ Left column: Image + (mobile-only) title/desc ━━ */}
        <div className="lg:col-span-7 space-y-7">
          {/* Image frame */}
          <div className="mkt-rise" style={{ animationDelay: '0.06s' }}>
            {imageFrame}
          </div>

          {/* Mobile: title + description below image */}
          <div className="lg:hidden space-y-5">
            <div className="mkt-rise" style={{ animationDelay: '0.14s' }}>
              {titleBlock}
            </div>
            {descriptionBlock && (
              <div className="mkt-rise" style={{ animationDelay: '0.22s' }}>
                {descriptionBlock}
              </div>
            )}
          </div>
        </div>

        {/* ━━ Right column: Desktop sticky sidebar ━━ */}
        <div
          ref={sidebarRef}
          className="hidden lg:block lg:col-span-5"
        >
          <div
            ref={sidebarInnerRef}
            className="lg:sticky"
            style={{ top: stickyTop }}
          >
            <div className="flex flex-col gap-7 lg:pt-2">
              {/* Title block */}
              <div className="mkt-rise" style={{ animationDelay: '0.14s' }}>
                {titleBlock}
              </div>

              {/* Description */}
              {descriptionBlock && (
                <div className="mkt-rise" style={{ animationDelay: '0.22s' }}>
                  {descriptionBlock}
                </div>
              )}

              {/* Checkout panel */}
              <div className="mkt-rise" style={{ animationDelay: '0.28s' }}>
                <SaleCheckoutPanel item={item} locale={locale} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── My Orders shortcut ─── */}
      <div className="mt-14 lg:mt-20 flex justify-center mkt-rise" style={{ animationDelay: '0.34s' }}>
        <Link
          href="/market/orders"
          className="group inline-flex items-center gap-2.5 px-7 py-3 text-sm font-bold tracking-wide text-ukraine-blue-900 bg-ukraine-gold-400 rounded-xl shadow-lg shadow-ukraine-gold-400/25 hover:bg-ukraine-gold-300 hover:shadow-xl hover:shadow-ukraine-gold-300/30 transition-all duration-200"
        >
          <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          {t('order.myOrders')}
          <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      {/* ─── Purchase History (full width) ─── */}
      <div className="mt-14 lg:mt-20 mkt-rise" style={{ animationDelay: '0.38s' }}>
        <MarketOrderList itemId={item.id} />
      </div>

      {/* ─── Mobile: BottomSheet with checkout ─── */}
      <div className="lg:hidden">
        <BottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          snapPoints={[0.15, 1]}
          minimizedHint={`${t('sale.buyNow')} — ${formatMarketPrice(price, item.currency)}`}
          hideWhenMinimized={hideSheetAtBottom}
        >
          <div className="px-4 pt-1 pb-4">
            <SaleCheckoutPanel item={item} locale={locale} />
          </div>
        </BottomSheet>
      </div>
    </div>
  )
}
