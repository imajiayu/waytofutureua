/**
 * Unsubscribed Client Component
 * Client-side component for unsubscribed page with navigation
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'

interface UnsubscribedClientProps {
  locale: string
  hasError: boolean
}

export default function UnsubscribedClient({ locale, hasError }: UnsubscribedClientProps) {
  const t = useTranslations('unsubscribed')
  const tc = useTranslations('common')
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleBackToHome = () => {
    setIsNavigating(true)
    router.push(`/${locale}`)
  }

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} loadingText={tc('loading')} />

      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="mb-6">
            {hasError ? (
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-warm-100">
                <svg
                  className="h-8 w-8 text-warm-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            ) : (
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-life-100">
                <svg
                  className="h-8 w-8 text-life-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          {hasError ? (
            <>
              <h1 className="mb-2 font-display text-2xl font-bold text-gray-900">
                {t('error.title')}
              </h1>
              <p className="mb-6 text-gray-600">{t('error.message')}</p>
            </>
          ) : (
            <>
              <h1 className="mb-2 font-display text-2xl font-bold text-gray-900">{t('title')}</h1>
              <p className="mb-2 text-gray-600">{t('message')}</p>
              <p className="mb-6 text-sm text-gray-500">{t('description')}</p>

              {/* Resubscribe Information */}
              <div className="mb-8 rounded-lg border border-ukraine-blue-200 bg-ukraine-blue-50 p-4">
                <p className="mb-2 text-sm font-medium text-ukraine-blue-900">
                  {t('resubscribe.title')}
                </p>
                <p className="text-sm text-ukraine-blue-600">{t('resubscribe.description')}</p>
              </div>
            </>
          )}

          {/* Back to Home Button */}
          <button
            onClick={handleBackToHome}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-ukraine-blue-500 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-ukraine-blue-600"
          >
            {t('backHome')}
          </button>
        </div>
      </div>
    </>
  )
}
