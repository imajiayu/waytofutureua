'use client'

import { useTranslations } from 'next-intl'

import type { FieldErrors, FieldKey } from './types'
import { clampAmount } from './utils'

const AMOUNT_OPTIONS = [10, 50, 100, 500] // For aggregated projects
const QUANTITY_OPTIONS = [1, 2, 5, 10]
const MAX_QUANTITY = 10
const MAX_AMOUNT = 10000

interface CommonProps {
  projectAmount: number
  fieldErrors: FieldErrors
  clearFieldError: (key: FieldKey) => void
}

interface AggregatedProps extends CommonProps {
  isAggregatedProject: true
  donationAmount: number
  donationAmountInput: string
  setDonationAmount: (val: number) => void
  setDonationAmountInput: (val: string) => void
  donationAmountRef: React.RefObject<HTMLInputElement | null>
}

interface UnitProps extends CommonProps {
  isAggregatedProject: false
  quantity: number
  setQuantity: (val: number) => void
  quantityRef: React.RefObject<HTMLInputElement | null>
}

type Props = AggregatedProps | UnitProps

export default function AmountQuantitySection(props: Props) {
  const t = useTranslations('donate')

  if (props.isAggregatedProject) {
    const {
      donationAmount,
      donationAmountInput,
      setDonationAmount,
      setDonationAmountInput,
      donationAmountRef,
      projectAmount,
      fieldErrors,
      clearFieldError,
    } = props
    return (
      <div>
        <label htmlFor="donation-amount" className="mb-2 block text-sm font-medium">
          {t('amount.label')} *
        </label>
        <div className="mb-3 grid grid-cols-4 gap-2">
          {AMOUNT_OPTIONS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => {
                clearFieldError('donationAmount')
                clearFieldError('total')
                setDonationAmount(amount)
                setDonationAmountInput(String(amount))
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                donationAmount === amount && donationAmountInput === String(amount)
                  ? 'border-ukraine-blue-500 bg-ukraine-blue-500 text-white shadow-md'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>
        <input
          ref={donationAmountRef}
          id="donation-amount"
          type="number"
          min="0.1"
          max="10000"
          step="0.1"
          value={donationAmountInput}
          onKeyDown={(e) => {
            if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
              e.preventDefault()
            }
          }}
          onChange={(e) => {
            clearFieldError('donationAmount')
            clearFieldError('total')
            const val = e.target.value
            setDonationAmountInput(val)
            // Live-update numeric state for total preview
            const num = parseFloat(val)
            setDonationAmount(!isNaN(num) && num >= 0 ? num : 0)
          }}
          onBlur={() => {
            const { value } = clampAmount(donationAmountInput, 0.1, MAX_AMOUNT, 10)
            setDonationAmount(value)
            setDonationAmountInput(String(value))
          }}
          aria-invalid={!!fieldErrors.donationAmount}
          aria-describedby={fieldErrors.donationAmount ? 'donation-amount-error' : undefined}
          className="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
          placeholder={t('amount.placeholder')}
        />
        {fieldErrors.donationAmount && (
          <p
            id="donation-amount-error"
            role="alert"
            className="mt-1 flex items-start gap-1 text-xs text-red-600"
          >
            <svg
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{fieldErrors.donationAmount}</span>
          </p>
        )}
        <div className="mt-2 rounded-lg bg-ukraine-blue-50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{t('payment.projectTotal')}:</span>
            <span className="font-data text-xl font-bold text-ukraine-blue-500">
              ${projectAmount.toFixed(2)} {t('payment.currency')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Unit-based Project: Quantity Selection
  const { quantity, setQuantity, quantityRef, projectAmount, fieldErrors, clearFieldError } = props
  return (
    <div>
      <label htmlFor="donation-quantity" className="mb-2 block text-sm font-medium">
        {t('quantity.label')} *
      </label>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {QUANTITY_OPTIONS.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => {
              clearFieldError('quantity')
              clearFieldError('total')
              setQuantity(num)
            }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              quantity === num
                ? 'border-ukraine-blue-500 bg-ukraine-blue-500 text-white shadow-md'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      <input
        ref={quantityRef}
        id="donation-quantity"
        type="number"
        min="1"
        max="10"
        value={quantity}
        onKeyDown={(e) => {
          // Prevent: e, E, +, -, and decimal point (quantity must be integer)
          if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
            e.preventDefault()
          }
        }}
        onChange={(e) => {
          clearFieldError('quantity')
          clearFieldError('total')
          const val = e.target.value
          if (val === '') {
            setQuantity(0)
            return
          }

          const num = parseInt(val, 10)
          // Prevent negative values and non-integers during input
          if (isNaN(num) || num < 0) {
            setQuantity(0)
            return
          }

          // Limit to max value
          if (num > MAX_QUANTITY) {
            setQuantity(MAX_QUANTITY)
            return
          }

          setQuantity(num)
        }}
        onBlur={(e) => {
          // Clean up on blur: ensure valid range and no leading zeros
          const num = parseInt(e.target.value, 10)

          if (isNaN(num) || num < 1) {
            setQuantity(1)
          } else if (num > MAX_QUANTITY) {
            setQuantity(MAX_QUANTITY)
          } else {
            setQuantity(num) // This removes leading zeros
          }
        }}
        aria-invalid={!!fieldErrors.quantity}
        aria-describedby={fieldErrors.quantity ? 'donation-quantity-error' : undefined}
        className="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
        placeholder={t('quantity.custom')}
      />
      {fieldErrors.quantity && (
        <p
          id="donation-quantity-error"
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
          <span>{fieldErrors.quantity}</span>
        </p>
      )}
      <div className="mt-2 rounded-lg bg-ukraine-blue-50 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t('payment.projectTotal')}:</span>
          <span className="font-data text-xl font-bold text-ukraine-blue-500">
            ${projectAmount.toFixed(2)} {t('payment.currency')}
          </span>
        </div>
      </div>
    </div>
  )
}
