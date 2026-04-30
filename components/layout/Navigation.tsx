'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'

import { localeNames, locales } from '@/i18n/config'
import { usePathname, useRouter } from '@/i18n/navigation'

import GlobalLoadingSpinner from './GlobalLoadingSpinner'

// Loading text for each language
const loadingTexts: Record<string, string> = {
  en: 'Loading...',
  zh: '加载中...',
  ua: 'Завантаження...',
}

export default function Navigation() {
  const t = useTranslations('navigation')
  const tMeta = useTranslations('metadata')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [targetLocale, setTargetLocale] = useState<string | null>(null)

  // Reset loading state when pathname changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  // Reset targetLocale when language switch is complete
  useEffect(() => {
    if (!isPending) {
      setTargetLocale(null)
    }
  }, [isPending])

  const handleLocaleChange = (newLocale: string) => {
    setTargetLocale(newLocale)
    startTransition(() => {
      // 保留当前的查询参数（如 ?order=xxx, ?project=xxx）
      const searchParams = typeof window !== 'undefined' ? window.location.search : ''
      const newPath = searchParams ? `${pathname}${searchParams}` : pathname
      router.replace(newPath, { locale: newLocale })
    })
    setIsDropdownOpen(false)
  }

  const handleDonateClick = () => {
    // 如果当前已经在 /donate 页面，触发事件拉起捐赠表单
    if (pathname === '/donate') {
      window.dispatchEvent(new CustomEvent('open-donation-form'))
      return
    }
    setIsNavigating(true)
    router.push('/donate')
  }

  const handleTrackDonation = () => {
    // 如果当前已经在 /track-donation 页面，不执行任何操作
    if (pathname === '/track-donation') {
      return
    }
    setIsNavigating(true)
    router.push('/track-donation')
  }

  const handleMarketClick = () => {
    if (pathname === '/market') return
    setIsNavigating(true)
    router.push('/market')
  }

  const handleLogoClick = () => {
    // 如果当前已经在首页，不执行任何操作
    if (pathname === '/') {
      return
    }
    setIsNavigating(true)
    router.push('/')
  }

  return (
    <>
      <GlobalLoadingSpinner
        isLoading={isNavigating || isPending}
        loadingText={targetLocale ? loadingTexts[targetLocale] : undefined}
      />
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <button
                onClick={handleLogoClick}
                className="flex cursor-pointer items-center transition-opacity duration-200 hover:opacity-75"
              >
                <Image
                  src="/images/logo.svg"
                  alt={tMeta('logoAlt')}
                  width={200}
                  height={100}
                  className="h-12 w-auto"
                  priority
                />
              </button>
            </div>

            {/* Right: Action Buttons + Language Switcher */}
            <div className="flex items-center space-x-3">
              {/* Action Buttons (Desktop) */}
              <div className="hidden items-center space-x-3 md:flex">
                <button
                  onClick={handleMarketClick}
                  className="group relative overflow-hidden rounded-lg bg-ukraine-blue-500 px-5 py-2 text-sm font-semibold tracking-wide text-white shadow-md transition-all duration-200 hover:bg-ukraine-blue-600 hover:shadow-lg"
                >
                  <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
                  <span className="relative z-10">{t('market')}</span>
                </button>
                <button
                  onClick={handleTrackDonation}
                  className="rounded-lg border-2 border-gray-300 bg-white px-5 py-2 text-sm font-semibold tracking-wide text-gray-700 transition-all duration-200 hover:border-ukraine-blue-300 hover:bg-ukraine-blue-50 hover:text-ukraine-blue-700"
                >
                  {t('trackDonation')}
                </button>
                <button
                  onClick={handleDonateClick}
                  className="group relative overflow-hidden rounded-lg bg-ukraine-gold-500 px-5 py-2 text-sm font-semibold tracking-wide text-ukraine-blue-900 shadow-md transition-all duration-200 hover:bg-ukraine-gold-600 hover:shadow-lg"
                >
                  <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
                  <span className="relative z-10">{t('donate')}</span>
                </button>
              </div>

              {/* Language Switcher */}
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isPending}
                  className="flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ukraine-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t('language.label')}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="listbox"
                >
                  <svg
                    className="h-5 w-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                  <span>{localeNames[locale as keyof typeof localeNames]}</span>
                  <svg
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                    {/* Dropdown */}
                    <div
                      role="listbox"
                      aria-label={t('language.label')}
                      className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
                    >
                      {locales.map((loc) => (
                        <button
                          key={loc}
                          role="option"
                          aria-selected={locale === loc}
                          onClick={() => handleLocaleChange(loc)}
                          className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                            locale === loc
                              ? 'bg-ukraine-blue-50 font-medium text-ukraine-blue-600'
                              : 'text-gray-700 hover:bg-ukraine-blue-50/50 hover:text-ukraine-blue-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{localeNames[loc]}</span>
                            {locale === loc && (
                              <svg
                                className="h-5 w-5 text-ukraine-blue-500"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Action Buttons Row */}
          <div className="flex items-center justify-center space-x-2 px-3 pb-3 pt-1 md:hidden">
            <button
              onClick={handleMarketClick}
              className="group relative flex-1 overflow-hidden whitespace-nowrap rounded-lg bg-ukraine-blue-500 px-3 py-2 text-xs font-semibold tracking-wide text-white shadow-md transition-all duration-200 active:bg-ukraine-blue-600"
            >
              <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
              <span className="relative z-10">{t('market')}</span>
            </button>
            <button
              onClick={handleTrackDonation}
              className="flex-1 whitespace-nowrap rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-xs font-semibold tracking-wide text-gray-700 transition-all duration-200 active:border-ukraine-blue-300 active:bg-ukraine-blue-50 active:text-ukraine-blue-700"
            >
              {t('trackDonation')}
            </button>
            <button
              onClick={handleDonateClick}
              className="group relative flex-1 overflow-hidden whitespace-nowrap rounded-lg bg-ukraine-gold-500 px-3 py-2 text-xs font-semibold tracking-wide text-ukraine-blue-900 shadow-md transition-all duration-200 active:bg-ukraine-gold-600"
            >
              <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
              <span className="relative z-10">{t('donate')}</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
