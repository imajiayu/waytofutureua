'use client'

import { useTranslations } from 'next-intl'

import { markDonationWidgetFailed } from '@/app/actions/donation'
import { SpinnerIcon } from '@/components/icons'
import { useWayForPayWidgetLifecycle } from '@/lib/hooks/useWayForPayWidgetLifecycle'

interface PaymentParams {
  orderReference: string
  returnUrl: string
  currency: string
  [key: string]: unknown
}

interface Props {
  paymentParams: PaymentParams
  amount: number
  locale: string
  onBack?: () => void
}

export default function WayForPayWidget({ paymentParams, amount, locale, onBack }: Props) {
  const t = useTranslations('donate')
  const tWidget = useTranslations('wayforpayWidget')

  const { isLoading, error, isRedirecting } = useWayForPayWidgetLifecycle({
    paymentParams,
    scriptId: 'widget-wfp-script',
    logCategory: 'WIDGET:WAYFORPAY',
    markAsFailed: markDonationWidgetFailed,
    errorMessages: {
      paymentLoadFailed: t('errors.paymentLoadFailed'),
      paymentFailed: t('errors.paymentFailed'),
      networkError: tWidget('networkError'),
      popupBlocked: tWidget('popupBlocked'),
      // WayForPay flow used `errors.serverError` in the catch branch
      initializationFailedFallback: t('errors.serverError'),
    },
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="mb-2 font-display text-xl font-bold text-gray-900">{t('payment.title')}</h2>
        <p className="text-sm text-gray-600">{tWidget('windowOpening')}</p>
      </div>

      {/* Amount Display */}
      <div className="rounded-lg border border-ukraine-blue-200 bg-ukraine-blue-50 p-4">
        <div className="text-center">
          <p className="mb-1 text-sm text-gray-600">{t('payment.total')}</p>
          <p className="font-data text-3xl font-bold text-ukraine-blue-500">
            ${amount.toFixed(2)} {paymentParams.currency}
          </p>
        </div>
      </div>

      {/* Redirecting State - Mobile devices */}
      {isRedirecting && !error && (
        <div className="rounded-lg border-2 border-ukraine-blue-200 bg-ukraine-blue-50 p-5">
          <div className="flex items-start gap-3">
            <SpinnerIcon className="h-6 w-6 flex-shrink-0 animate-spin text-ukraine-blue-500" />
            <div className="flex-1">
              <p className="mb-2 text-base font-bold text-ukraine-blue-800">
                {tWidget('redirecting.title')}
              </p>
              <p className="mb-3 text-sm text-ukraine-blue-600">
                {tWidget('redirecting.description')}
              </p>
              <div className="flex items-center gap-2 text-xs text-ukraine-blue-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{tWidget('redirecting.popupHint')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border-2 border-warm-200 bg-warm-50 p-5">
          <div className="mb-4 flex gap-3">
            <svg
              className="h-6 w-6 flex-shrink-0 text-warm-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="mb-2 text-base font-bold text-warm-800">
                {tWidget('paymentFailed.title')}
              </p>
              <p className="mb-3 text-sm text-warm-700">{error}</p>
              <p className="text-xs text-warm-600">{tWidget('paymentFailed.message')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <SpinnerIcon className="h-12 w-12 animate-spin text-ukraine-blue-500" />
          <p className="font-medium text-gray-600">{t('payment.loading')}</p>
          <p className="text-sm text-gray-500">{tWidget('preparing')}</p>
        </div>
      )}

      {/* Back Button - Always show when not loading */}
      {!isLoading && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>{tWidget('backToEdit')}</span>
        </button>
      )}

      {/* Security Notice */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex gap-3">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="mb-1 font-medium">{tWidget('securePayment.title')}</p>
            <p className="text-gray-600">{tWidget('securePayment.description')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
