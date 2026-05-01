'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import type { CurrencyInfo } from '@/app/actions/donation'
import { getNetworkDisplayName } from '@/lib/payment/network-names'

interface CryptoOptionCardProps {
  currency: CurrencyInfo
  isSelected: boolean
  isLoading: boolean
  onClick: () => void
}

export default function CryptoOptionCard({
  currency,
  isSelected,
  isLoading,
  onClick,
}: CryptoOptionCardProps) {
  const t = useTranslations('donate.cryptoSelector')

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`w-full rounded-lg border-2 p-3 transition-all duration-200 ${
        isSelected
          ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-500 ring-offset-1'
          : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
      } ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <div className="flex items-center gap-3">
        {/* Logo from NOWPayments */}
        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-gray-100">
          <Image
            src={currency.logoUrl}
            alt={currency.name}
            width={40}
            height={40}
            className="h-full w-full object-contain"
            onError={(e) => {
              // Fallback to placeholder on error
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>

        {/* Text */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{currency.name}</span>
            {currency.isStable && (
              <span className="rounded bg-ukraine-blue-100 px-1.5 py-0.5 text-xs text-ukraine-blue-600">
                {t('stablecoinBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">{getNetworkDisplayName(currency.network)}</p>
        </div>

        {/* Checkmark for selected */}
        {isSelected && (
          <div className="flex-shrink-0 text-emerald-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </button>
  )
}
