'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import { usePathname, useRouter } from '@/i18n/navigation'

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-8 text-center md:mb-10">
            <span className="mb-3 inline-block rounded-full bg-ukraine-gold-500 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-ukraine-blue-900">
              {t('label')}
            </span>
            <h2 className="mb-3 font-display text-4xl font-bold text-gray-900 sm:text-5xl md:mb-4 lg:text-6xl">
              {t('title')}
            </h2>
            <p className="mx-auto mb-6 max-w-3xl text-lg font-light text-gray-600 sm:text-xl">
              {t('subtitle')}
            </p>

            {/* Track Your Donation Button */}
            <div className="flex justify-center">
              <button
                onClick={handleTrackClick}
                className="group relative overflow-hidden rounded-lg bg-ukraine-blue-500 px-5 py-2 text-sm font-semibold tracking-wide text-white shadow-md transition-all duration-200 hover:bg-ukraine-blue-600 hover:shadow-lg"
              >
                <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
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
