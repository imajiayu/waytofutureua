'use client'

import { useTranslations } from 'next-intl'

import WayForPayWidget from '@/components/donate-form/widgets/WayForPayWidget'
import { SpinnerIcon } from '@/components/icons'

export interface PaymentStateViewProps {
  processingState:
    | 'idle'
    | 'selecting_method'
    | 'selecting_crypto'
    | 'creating'
    | 'ready'
    | 'crypto_ready'
    | 'error'
  paymentParams: any | null
  amount: number
  locale: string
  error: string | null
  onBack: () => void
}

/**
 * Renders the `creating` / `error` / `ready` payment widget states.
 *
 * Extracted verbatim from the file-local `PaymentWidgetContainer` previously
 * defined in `DonationFormCard.tsx`. JSX, classNames and prop order are 1:1
 * unchanged so the visual output is identical.
 */
export default function PaymentStateView({
  processingState,
  paymentParams,
  amount,
  locale,
  error,
  onBack,
}: PaymentStateViewProps) {
  const t = useTranslations('donate')

  // Creating donation state
  if (processingState === 'creating') {
    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="mb-2 font-display text-xl font-bold text-gray-900">
            {t('processing.title')}
          </h2>
          <p className="text-sm text-gray-600">{t('processing.wait')}</p>
        </div>

        {/* Amount Display */}
        <div className="rounded-lg border border-ukraine-blue-200 bg-gradient-to-br from-ukraine-blue-50 to-ukraine-gold-50/30 p-4">
          <div className="text-center">
            <p className="mb-1 text-sm text-gray-600">{t('processing.donationAmount')}</p>
            <p className="font-data text-3xl font-bold text-ukraine-blue-500">
              ${amount.toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Processing Animation */}
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <SpinnerIcon className="h-16 w-16 animate-spin text-ukraine-blue-500" />
          <p className="font-medium text-gray-600">{t('processing.creatingRecord')}</p>
        </div>

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
              <p className="mb-1 font-medium">{t('securePayment.title')}</p>
              <p className="text-gray-600">{t('securePayment.description')}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (processingState === 'error' || error) {
    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="mb-2 font-display text-xl font-bold text-gray-900">
            {t('paymentError.title')}
          </h2>
        </div>

        {/* Amount Display */}
        <div className="rounded-lg border border-ukraine-blue-200 bg-gradient-to-br from-ukraine-blue-50 to-ukraine-gold-50/30 p-4">
          <div className="text-center">
            <p className="mb-1 text-sm text-gray-600">{t('processing.donationAmount')}</p>
            <p className="font-data text-3xl font-bold text-ukraine-blue-500">
              ${amount.toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Error Message */}
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
                {t('paymentError.unableToProcess')}
              </p>
              <p className="mb-3 text-sm text-warm-700">{error}</p>
              <p className="text-xs text-warm-600">{t('paymentError.tryAgainMessage')}</p>
            </div>
          </div>
          {/* Network Access Notice */}
          <div className="border-t border-warm-300 pt-3">
            <p className="text-sm font-medium text-ukraine-gold-700">{t('networkNotice')}</p>
          </div>
        </div>

        {/* Back Button */}
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
          <span>{t('paymentError.backToEdit')}</span>
        </button>
      </div>
    )
  }

  // Ready state - show WayForPay widget
  if (processingState === 'ready' && paymentParams) {
    return (
      <WayForPayWidget
        paymentParams={paymentParams}
        amount={amount}
        locale={locale}
        onBack={onBack}
      />
    )
  }

  // Fallback
  return null
}
