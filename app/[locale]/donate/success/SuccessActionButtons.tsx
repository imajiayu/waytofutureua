'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import { useRouter } from '@/i18n/navigation'

export default function SuccessActionButtons() {
  const t = useTranslations('donateSuccess')
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleTrackDonation = () => {
    setIsNavigating(true)
    router.push('/track-donation')
  }

  const handleBackHome = () => {
    setIsNavigating(true)
    router.push('/')
  }

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />

      <div className="mt-12 flex flex-col justify-center gap-4 sm:flex-row">
        <button
          onClick={handleTrackDonation}
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-ukraine-gold-500 px-8 py-4 font-semibold text-ukraine-blue-900 shadow-xl transition-all duration-300 hover:scale-105 hover:bg-ukraine-gold-600 hover:shadow-2xl"
        >
          {/* Button Shine Effect */}
          <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>

          <svg
            className="relative z-10 mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="relative z-10">{t('actions.trackDonation')}</span>
        </button>

        <button
          onClick={handleBackHome}
          className="inline-flex items-center justify-center rounded-2xl border-2 border-gray-200 bg-white px-8 py-4 font-semibold text-gray-700 shadow-lg transition-all duration-300 hover:scale-105 hover:border-gray-300 hover:shadow-xl"
        >
          <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {t('actions.backHome')}
        </button>
      </div>
    </>
  )
}
