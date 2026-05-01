'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import {
  type CurrencyInfo,
  getNowPaymentsCurrencies,
  getNowPaymentsMinimum,
} from '@/app/actions/donation'
import { SpinnerIcon } from '@/components/icons'

import CryptoOptionCard from './widgets/CryptoOptionCard'

interface CryptoSelectorProps {
  amount: number
  onSelectCrypto: (currency: string) => void
  onBack: () => void
  isLoading?: boolean
}

export default function CryptoSelector({
  amount,
  onSelectCrypto,
  onBack,
  isLoading = false,
}: CryptoSelectorProps) {
  const t = useTranslations('donate')
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'stablecoins'>('all')
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([])
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [minAmount, setMinAmount] = useState<number | null>(null)
  const [isLoadingMin, setIsLoadingMin] = useState(false)

  // Load available currencies on mount
  useEffect(() => {
    async function loadCurrencies() {
      setIsLoadingCurrencies(true)
      setLoadError(null)
      try {
        const result = await getNowPaymentsCurrencies()
        if (result.success && result.currencies) {
          setCurrencies(result.currencies)
        } else {
          setLoadError(result.error || 'Failed to load currencies')
        }
      } catch {
        setLoadError('Failed to load currencies')
      } finally {
        setIsLoadingCurrencies(false)
      }
    }
    loadCurrencies()
  }, [])

  // Load minimum amount when currency is selected
  useEffect(() => {
    if (!selectedCrypto) {
      setMinAmount(null)
      return
    }

    const currency = selectedCrypto
    async function loadMinimum() {
      setIsLoadingMin(true)
      try {
        const result = await getNowPaymentsMinimum(currency)
        if (result.success && result.minAmount !== undefined) {
          setMinAmount(result.minAmount)
        }
      } catch {
        // Ignore minimum amount errors
      } finally {
        setIsLoadingMin(false)
      }
    }
    loadMinimum()
  }, [selectedCrypto])

  // Filter and sort currencies
  const filteredCurrencies = useMemo(() => {
    let filtered = currencies

    // Filter by tab
    if (activeFilter === 'popular') {
      filtered = filtered.filter((c) => c.isPopular)
    } else if (activeFilter === 'stablecoins') {
      filtered = filtered.filter((c) => c.isStable)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (currency) =>
          currency.code.toLowerCase().includes(query) ||
          currency.name.toLowerCase().includes(query) ||
          currency.network.toLowerCase().includes(query)
      )
    }

    // Sort: popular first, then stablecoins, then alphabetically
    return filtered.sort((a, b) => {
      // Popular currencies first
      if (a.isPopular && !b.isPopular) return -1
      if (!a.isPopular && b.isPopular) return 1

      // Stablecoins second
      if (a.isStable && !b.isStable) return -1
      if (!a.isStable && b.isStable) return 1

      // Then alphabetically by name
      return a.name.localeCompare(b.name)
    })
  }, [currencies, searchQuery, activeFilter])

  // Check if amount is below minimum
  const isBelowMinimum = minAmount !== null && amount < minAmount
  const canContinue = selectedCrypto && !isLoading && !isLoadingMin && !isBelowMinimum

  const handleSelect = (cryptoCode: string) => {
    setSelectedCrypto(cryptoCode)
  }

  const handleConfirm = () => {
    if (selectedCrypto && canContinue) {
      onSelectCrypto(selectedCrypto)
    }
  }

  // Get selected currency info
  const selectedCurrencyInfo = selectedCrypto
    ? currencies.find((c) => c.code === selectedCrypto)
    : null

  // Loading state
  if (isLoadingCurrencies) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center">
          <h2 className="mb-2 font-display text-xl font-bold text-gray-900">
            {t('cryptoSelector.title')}
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <SpinnerIcon className="mb-4 h-10 w-10 animate-spin text-emerald-600" />
          <p className="text-gray-600">{t('cryptoSelector.loading')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (loadError) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center">
          <h2 className="mb-2 font-display text-xl font-bold text-gray-900">
            {t('cryptoSelector.title')}
          </h2>
        </div>
        <div className="rounded-lg border border-warm-200 bg-warm-50 p-4 text-center">
          <p className="text-warm-700">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50"
        >
          {t('cryptoSelector.back')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="mb-1 font-display text-xl font-bold text-gray-900">
          {t('cryptoSelector.title')}
        </h2>
        <p className="text-sm text-gray-600">{t('cryptoSelector.subtitle')}</p>
      </div>

      {/* Amount Display */}
      <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-3">
        <div className="text-center">
          <p className="mb-1 text-sm text-gray-600">{t('payment.total')}</p>
          <p className="font-data text-2xl font-bold text-emerald-600">${amount.toFixed(2)} USD</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('cryptoSelector.searchPlaceholder')}
          className="w-full rounded-lg border border-gray-300 p-3 pl-10 focus:border-transparent focus:ring-2 focus:ring-emerald-500"
        />
        <svg
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'popular', 'stablecoins'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeFilter === filter
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t(`cryptoSelector.filter.${filter}`)}
          </button>
        ))}
      </div>

      {/* Crypto Options */}
      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {filteredCurrencies.map((currency) => (
          <CryptoOptionCard
            key={currency.code}
            currency={currency}
            isSelected={selectedCrypto === currency.code}
            isLoading={isLoading}
            onClick={() => handleSelect(currency.code)}
          />
        ))}
      </div>

      {/* Minimum amount info / error */}
      {selectedCrypto && (
        <div
          className={`rounded-lg border p-3 ${
            isBelowMinimum ? 'border-warm-200 bg-warm-50' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex items-start gap-2">
            <svg
              className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
                isBelowMinimum ? 'text-warm-600' : 'text-amber-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isBelowMinimum ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <div className={`text-sm ${isBelowMinimum ? 'text-warm-800' : 'text-amber-800'}`}>
              {isLoadingMin ? (
                <span>{t('cryptoSelector.loadingMinimum')}</span>
              ) : minAmount !== null ? (
                isBelowMinimum ? (
                  <span>
                    {t('cryptoSelector.amountBelowMinimum', {
                      currency: selectedCurrencyInfo?.name || selectedCrypto,
                      minimum: minAmount.toFixed(2),
                      current: amount.toFixed(2),
                    })}
                  </span>
                ) : (
                  <span>
                    {t('cryptoSelector.minimumAmount', {
                      currency: selectedCurrencyInfo?.name || selectedCrypto,
                      amount: minAmount.toFixed(2),
                    })}
                  </span>
                )
              ) : (
                <span>{t('cryptoSelector.notice.description')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canContinue}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
            canContinue
              ? 'bg-emerald-600 text-white shadow-md hover:bg-emerald-700 hover:shadow-lg'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="h-5 w-5 animate-spin" />
              {t('cryptoSelector.creating')}
            </>
          ) : (
            <>
              {t('cryptoSelector.continue')}
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          {t('cryptoSelector.back')}
        </button>
      </div>
    </div>
  )
}
