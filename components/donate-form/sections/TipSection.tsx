'use client'

import { useTranslations } from 'next-intl'

import type { FieldErrors, FieldKey } from './types'
import { clampAmount } from './utils'

interface Props {
  locale: string
  tipAmount: number
  tipAmountInput: string
  setTipAmount: (val: number) => void
  setTipAmountInput: (val: string) => void
  tipAmountRef: React.RefObject<HTMLInputElement | null>
  fieldErrors: FieldErrors
  clearFieldError: (key: FieldKey) => void
}

const TIP_OPTIONS = [5, 10, 20]

export default function TipSection({
  locale,
  tipAmount,
  tipAmountInput,
  setTipAmount,
  setTipAmountInput,
  tipAmountRef,
  fieldErrors,
  clearFieldError,
}: Props) {
  const t = useTranslations('donate')

  return (
    <div className="border-t pt-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <h4 className="font-display font-semibold text-gray-900">{t('tip.title')}</h4>
        <div className="flex-shrink-0 rounded border border-ukraine-gold-200 bg-ukraine-gold-50 px-2 py-1 text-xs font-medium text-ukraine-gold-700">
          {t('tip.optional')}
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-ukraine-gold-200 bg-gradient-to-br from-ukraine-gold-50 to-ukraine-gold-100 p-4">
        <p className="mb-3 text-sm font-medium text-gray-800">{t('tip.description')}</p>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/80 p-3 text-center">
            <div className="font-data text-2xl font-bold text-ukraine-gold-600">1,600+</div>
            <div className="mt-1 text-xs text-gray-600">{t('tip.patientsServed')}</div>
          </div>
          <div className="rounded-lg bg-white/80 p-3 text-center">
            <div className="font-data text-2xl font-bold text-ukraine-gold-600">$1,000</div>
            <div className="mt-1 text-xs text-gray-600">{t('tip.avgCostPerPatient')}</div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-600">{t('tip.asOfDate')}</div>
      </div>

      <a
        href={`/${locale}/donate?project=0`}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ukraine-blue-500 hover:text-ukraine-blue-600"
      >
        {t('tip.viewDetails')}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {TIP_OPTIONS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => {
              clearFieldError('tipAmount')
              clearFieldError('total')
              setTipAmount(amount)
              setTipAmountInput(String(amount))
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              tipAmount === amount && tipAmountInput === String(amount)
                ? 'border-ukraine-gold-600 bg-ukraine-gold-600 text-white shadow-md'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            ${amount}
          </button>
        ))}
      </div>
      <input
        ref={tipAmountRef}
        id="tip-amount"
        type="number"
        min="0"
        max="9999.9"
        step="0.1"
        value={tipAmountInput}
        onKeyDown={(e) => {
          if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
            e.preventDefault()
          }
        }}
        onChange={(e) => {
          clearFieldError('tipAmount')
          clearFieldError('total')
          const val = e.target.value
          setTipAmountInput(val)
          const num = parseFloat(val)
          setTipAmount(!isNaN(num) && num >= 0 ? num : 0)
        }}
        onBlur={() => {
          const { value } = clampAmount(tipAmountInput, 0, 9999.9, 0)
          setTipAmount(value)
          setTipAmountInput(value === 0 ? '' : String(value))
        }}
        aria-invalid={!!fieldErrors.tipAmount}
        aria-describedby={fieldErrors.tipAmount ? 'tip-amount-error' : undefined}
        className="w-full rounded-lg border border-gray-300 p-2.5 focus:border-transparent focus:ring-2 focus:ring-ukraine-gold-500"
        placeholder={t('tip.placeholder')}
      />
      {fieldErrors.tipAmount && (
        <p
          id="tip-amount-error"
          role="alert"
          className="mt-1 flex items-start gap-1 text-xs text-red-600"
        >
          <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{fieldErrors.tipAmount}</span>
        </p>
      )}
      {tipAmount > 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-ukraine-gold-700">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
          {t('tip.thankYou')}
        </p>
      )}
    </div>
  )
}
