'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'

const DonationStatusFlow = dynamic(
  () => import('@/components/donation-display/DonationStatusFlow'),
  { ssr: false }
)

export default function DonationJourneySection() {
  const t = useTranslations('home.hero.donationJourney')
  const tFlow = useTranslations('donationStatusFlow')
  const router = useRouter()
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  // Reset loading state when pathname changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const handleTrackClick = () => {
    setIsNavigating(true)
    router.push('/track-donation')
  }

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />
      <section className="relative py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-8 md:mb-10">
            <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-ukraine-gold-500 text-ukraine-blue-900 rounded-full mb-3">
              {t('label')}
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 md:mb-4 font-display">
              {t('title')}
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 font-light">
              {t('subtitle')}
            </p>

            {/* Track Your Donation Button */}
            <div className="flex justify-center">
              <button
                onClick={handleTrackClick}
                className="group relative px-5 py-2 text-sm font-semibold tracking-wide text-white bg-ukraine-blue-500 hover:bg-ukraine-blue-600 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10">{tFlow('trackButton')}</span>
              </button>
            </div>
          </div>

        {/* Donation Flow Component */}
        <DonationStatusFlow />
      </div>
    </section>
    </>
  )
}
