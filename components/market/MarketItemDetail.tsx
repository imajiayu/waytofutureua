'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Link } from '@/i18n/navigation'
import { useMarketItemContent } from '@/lib/hooks/useMarketItemContent'
import { getTranslatedText } from '@/lib/i18n-utils'
import { getItemDisplayInfo } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { AppLocale } from '@/types'
import type { PublicMarketItem } from '@/types/market'

import MarketOrderList from './MarketOrderList'
import SaleCheckoutPanel from './SaleCheckoutPanel'

const PURCHASE_RECORDS_ID = 'purchase-records'

const BottomSheet = dynamic(() => import('@/components/common/BottomSheet'), {
  ssr: false,
  loading: () => null,
})

// ── Constants ──
const NAV_HEIGHT = 96 // top-24 = 6rem
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
  const title = getTranslatedText(item.title_i18n, null, locale as AppLocale) || 'Untitled'
  const { labelKey, colors } = getItemDisplayInfo(item.status, item.stock_quantity)
  const { data: content, loading } = useMarketItemContent(item.id, locale)
  const price = item.fixed_price || 0

  const scrollToPurchaseRecords = useCallback(() => {
    document.getElementById(PURCHASE_RECORDS_ID)?.scrollIntoView({ behavior: 'smooth' })
  }, [])

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
      <div className="rounded-[2px] bg-[#FAFAF7] p-2.5 shadow-[0_2px_36px_-8px_rgba(0,0,0,0.10),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-stone-200/70 sm:p-4">
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
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-stone-500" />
              ) : (
                <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
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
      <h1 className="font-display text-[1.7rem] font-bold leading-[1.18] tracking-tight text-gray-900 sm:text-[2rem] lg:text-[2.2rem]">
        {title}
        <span
          className={`ml-2 inline-flex items-center rounded-full px-3 py-1 align-[0.12em] text-sm font-semibold shadow-sm ${colors.bg} ${colors.text}`}
        >
          {t(labelKey)}
        </span>
      </h1>

      {/* Gold accent rule */}
      <div className="mt-4 flex items-center gap-0">
        <div className="h-[2px] w-10 rounded-full bg-ukraine-gold-400" />
        <div className="h-[2px] w-6 rounded-full bg-ukraine-gold-300/50" />
      </div>

      {/* Charity policy notice */}
      <p className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed text-amber-700/70">
        <svg
          className="mt-[3px] h-3.5 w-3.5 shrink-0 text-amber-600/50"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
        <span>
          {t.rich('charityNotice', {
            contact: (chunks) => (
              <a
                href="mailto:contact@waytofutureua.org.ua"
                className="font-medium underline decoration-amber-600/30 underline-offset-2 transition-colors duration-150 hover:text-amber-800 hover:decoration-amber-600/50"
              >
                {chunks}
              </a>
            ),
          })}
        </span>
      </p>

      {/* Fund usage transparency notice */}
      <div className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-emerald-700/70">
        <svg
          className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600/50"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
          />
        </svg>
        <span>
          {t('fundProofNotice')}{' '}
          <button
            type="button"
            onClick={scrollToPurchaseRecords}
            className="inline-flex items-center gap-0.5 font-medium text-emerald-700/90 underline decoration-emerald-600/30 underline-offset-2 transition-colors duration-150 hover:text-emerald-800 hover:decoration-emerald-600/50"
          >
            {t('viewPurchaseRecords')}
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
              />
            </svg>
          </button>
        </span>
      </div>
    </div>
  )

  const descriptionBlock =
    content?.description && content.description.length > 0 ? (
      <div className="space-y-3">
        {content.description.map((paragraph, i) => (
          <p key={i} className="text-[15px] leading-[1.75] text-gray-500">
            {paragraph}
          </p>
        ))}
      </div>
    ) : null

  return (
    <div>
      {/* ─── Main 2-column grid ─── */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
        {/* ━━ Left column: Image + (mobile-only) title/desc ━━ */}
        <div className="space-y-7 lg:col-span-7">
          {/* Image frame */}
          <div className="mkt-rise" style={{ animationDelay: '0.06s' }}>
            {imageFrame}
          </div>

          {/* Mobile: title + description below image */}
          <div className="space-y-5 lg:hidden">
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
        <div ref={sidebarRef} className="hidden lg:col-span-5 lg:block">
          <div ref={sidebarInnerRef} className="lg:sticky" style={{ top: stickyTop }}>
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
      <div
        className="mkt-rise mt-14 flex justify-center lg:mt-20"
        style={{ animationDelay: '0.34s' }}
      >
        <Link
          href="/market/orders"
          className="group inline-flex items-center gap-2.5 rounded-xl bg-ukraine-gold-400 px-7 py-3 text-sm font-bold tracking-wide text-ukraine-blue-900 shadow-lg shadow-ukraine-gold-400/25 transition-all duration-200 hover:bg-ukraine-gold-300 hover:shadow-xl hover:shadow-ukraine-gold-300/30"
        >
          <svg
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
          {t('order.myOrders')}
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
        </Link>
      </div>

      {/* ─── Purchase History (full width) ─── */}
      <div
        id={PURCHASE_RECORDS_ID}
        className="mkt-rise mt-14 scroll-mt-28 lg:mt-20"
        style={{ animationDelay: '0.38s' }}
      >
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
          <div className="px-4 pb-4 pt-1">
            <SaleCheckoutPanel item={item} locale={locale} />
          </div>
        </BottomSheet>

        {/* P3-4: FAB 重新打开 BottomSheet */}
        {!isSheetOpen && !hideSheetAtBottom && (
          <button
            onClick={() => setIsSheetOpen(true)}
            className="animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ukraine-gold-400 px-5 py-3.5 text-sm font-bold text-ukraine-blue-900 shadow-lg shadow-ukraine-gold-400/30 transition-all duration-200 hover:bg-ukraine-gold-300 active:scale-95"
            aria-label={t('sale.buyNow')}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            {t('sale.buyNow')} — {formatMarketPrice(price, item.currency)}
          </button>
        )}
      </div>
    </div>
  )
}
