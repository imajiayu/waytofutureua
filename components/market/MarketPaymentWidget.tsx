'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { cancelMarketOrder, markMarketOrderWidgetFailed } from '@/app/actions/market-sale'
import { SpinnerIcon } from '@/components/icons'
import { useWayForPayWidgetLifecycle } from '@/lib/hooks/useWayForPayWidgetLifecycle'
import { formatMarketPrice } from '@/lib/market/market-utils'

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

export default function MarketPaymentWidget({ paymentParams, amount, locale, onBack }: Props) {
  const t = useTranslations('market')
  const tDonate = useTranslations('donate')
  const tWidget = useTranslations('wayforpayWidget')
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const { isLoading, error, isRedirecting } = useWayForPayWidgetLifecycle({
    paymentParams,
    scriptId: 'widget-wfp-script-market',
    logCategory: 'WIDGET:MARKET',
    markAsFailed: markMarketOrderWidgetFailed,
    errorMessages: {
      paymentLoadFailed: t('errors.paymentLoadFailed'),
      paymentFailed: t('errors.paymentFailed'),
      networkError: tWidget('networkError'),
      popupBlocked: tWidget('popupBlocked'),
      // Market flow used `errors.paymentLoadFailed` in the catch branch (different from donation flow)
      initializationFailedFallback: t('errors.paymentLoadFailed'),
    },
  })

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ── Header + Amount ── */}
      <div className="border-b border-gray-100 bg-gradient-to-b from-ukraine-blue-50/60 to-transparent px-5 pb-5 pt-6 text-center">
        <h2 className="font-display text-lg font-bold text-gray-900">
          {t('checkout.paymentTitle')}
        </h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">{tWidget('windowOpening')}</p>
        <div className="inline-flex items-baseline gap-1.5">
          <span className="font-data text-3xl font-bold text-ukraine-blue-600">
            {formatMarketPrice(amount, paymentParams.currency)}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5">
        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center space-y-3 py-8">
            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-gray-200 border-t-ukraine-blue-500" />
            <p className="text-sm text-gray-500">{tWidget('preparing')}</p>
          </div>
        )}

        {/* ── Mobile redirecting ── */}
        {isRedirecting && !error && (
          <div className="rounded-xl border border-ukraine-blue-200 bg-ukraine-blue-50 p-4">
            <div className="flex items-start gap-3">
              <SpinnerIcon className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-ukraine-blue-500" />
              <div className="flex-1">
                <p className="mb-1 text-sm font-semibold text-ukraine-blue-800">
                  {tWidget('redirecting.title')}
                </p>
                <p className="text-[13px] leading-relaxed text-ukraine-blue-600">
                  {tWidget('redirecting.description')}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ukraine-blue-400">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {tWidget('redirecting.popupHint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-warm-200 bg-warm-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-warm-500"
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
              <div className="flex-1">
                <p className="mb-1 text-sm font-semibold text-warm-800">
                  {tWidget('paymentFailed.title')}
                </p>
                <p className="text-[13px] leading-relaxed text-warm-700">{error}</p>
                <p className="mt-1.5 text-xs text-warm-600">{tWidget('paymentFailed.message')}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── VPN / Firewall hint ── */}
        {!isLoading && !isRedirecting && !error && (
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 p-3.5">
            <div className="flex items-start gap-2.5">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z"
                />
              </svg>
              <p className="text-[13px] leading-relaxed text-amber-700">
                {tDonate('networkNotice')}
              </p>
            </div>
          </div>
        )}

        {/* ── Cancel error — order already processed ── */}
        {cancelError && (
          <div className="rounded-xl border border-ukraine-blue-200 bg-ukraine-blue-50 p-4">
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-ukraine-blue-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                />
              </svg>
              <div className="flex-1">
                <p className="mb-1 text-sm font-semibold text-ukraine-blue-800">
                  {t('checkout.orderAlreadyProcessed')}
                </p>
                <p className="text-[13px] leading-relaxed text-ukraine-blue-600">
                  {t('checkout.orderAlreadyProcessedHint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Modify & Retry button ── */}
        {!isLoading && onBack && !cancelError && (
          <button
            type="button"
            disabled={isCancelling}
            onClick={async () => {
              setIsCancelling(true)
              setCancelError(null)
              try {
                const result = await cancelMarketOrder(paymentParams.orderReference)
                if (!result.success && result.error === 'order_already_processed') {
                  setCancelError(result.error)
                } else {
                  onBack()
                }
              } catch {
                onBack()
              } finally {
                setIsCancelling(false)
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCancelling ? (
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
                />
              </svg>
            )}
            {t('checkout.modifyAndRetry')}
          </button>
        )}

        {/* ── Security notice ── */}
        <div className="flex items-start gap-2.5 pt-1">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-xs leading-relaxed text-gray-400">
            {tWidget('securePayment.description')}
          </p>
        </div>
      </div>
    </div>
  )
}
