'use client'

import { useTranslations } from 'next-intl'

import type { FieldErrors } from './types'

interface Props {
  projectAmount: number
  tipAmount: number
  totalAmount: number
  fieldErrors: FieldErrors
  totalAmountRef: React.RefObject<HTMLDivElement | null>
}

export default function TotalSummarySection({
  projectAmount,
  tipAmount,
  totalAmount,
  fieldErrors,
  totalAmountRef,
}: Props) {
  const t = useTranslations('donate')

  return (
    <div ref={totalAmountRef} className="border-t pt-3" tabIndex={-1}>
      <div className="rounded-lg border border-ukraine-blue-200 bg-gradient-to-br from-ukraine-blue-50 to-ukraine-gold-50/30 p-3">
        <div className="space-y-2">
          {/* Show breakdown if there's a tip */}
          {tipAmount > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('payment.projectDonation')}:</span>
                <span className="font-data font-semibold text-gray-900">
                  ${projectAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{t('payment.tipAmount')}:</span>
                <span className="font-data font-semibold text-ukraine-gold-700">
                  ${tipAmount.toFixed(2)}
                </span>
              </div>
              <div className="my-2 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            </>
          )}
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">{t('payment.total')}:</span>
            <span className="font-data text-2xl font-bold text-ukraine-blue-500">
              ${totalAmount.toFixed(2)} {t('payment.currency')}
            </span>
          </div>
        </div>
      </div>
      {fieldErrors.total && (
        <p
          id="total-amount-error"
          role="alert"
          className="mt-2 flex items-start gap-1 text-xs text-red-600"
        >
          <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{fieldErrors.total}</span>
        </p>
      )}
    </div>
  )
}
