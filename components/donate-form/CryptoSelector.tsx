'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { getNowPaymentsCurrencies, getNowPaymentsMinimum, type CurrencyInfo } from '@/app/actions/donation'
import { SpinnerIcon } from '@/components/icons'

interface CryptoSelectorProps {
  amount: number
  onSelectCrypto: (currency: string) => void
  onBack: () => void
  isLoading?: boolean
}

// Network display names
const NETWORK_NAMES: Record<string, string> = {
  trx: 'Tron (TRC20)',
  eth: 'Ethereum (ERC20)',
  bsc: 'BNB Smart Chain (BEP20)',
  sol: 'Solana',
  matic: 'Polygon',
  btc: 'Bitcoin',
  ltc: 'Litecoin',
  ada: 'Cardano',
  xrp: 'XRP Ledger',
  doge: 'Dogecoin',
  avax: 'Avalanche C-Chain',
  arb: 'Arbitrum One',
  op: 'Optimism',
  base: 'Base',
  ton: 'TON',
  near: 'NEAR',
  algo: 'Algorand',
  xlm: 'Stellar',
  atom: 'Cosmos',
  dot: 'Polkadot',
}

function getNetworkDisplayName(network: string): string {
  return NETWORK_NAMES[network.toLowerCase()] || network.toUpperCase()
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
      filtered = filtered.filter(c => c.isPopular)
    } else if (activeFilter === 'stablecoins') {
      filtered = filtered.filter(c => c.isStable)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(currency =>
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
    ? currencies.find(c => c.code === selectedCrypto)
    : null

  // Loading state
  if (isLoadingCurrencies) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-display">
            {t('cryptoSelector.title')}
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <SpinnerIcon className="animate-spin h-10 w-10 text-emerald-600 mb-4" />
          <p className="text-gray-600">{t('cryptoSelector.loading')}</p>
        </div>
      </div>
    )
  }

  // Error state
  if (loadError) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-display">
            {t('cryptoSelector.title')}
          </h2>
        </div>
        <div className="p-4 bg-warm-50 border border-warm-200 rounded-lg text-center">
          <p className="text-warm-700">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
        >
          {t('cryptoSelector.back')}
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-1 font-display">
          {t('cryptoSelector.title')}
        </h2>
        <p className="text-sm text-gray-600">
          {t('cryptoSelector.subtitle')}
        </p>
      </div>

      {/* Amount Display */}
      <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">
            {t('payment.total')}
          </p>
          <p className="text-2xl font-bold text-emerald-600 font-data">
            ${amount.toFixed(2)} USD
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('cryptoSelector.searchPlaceholder')}
          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'popular', 'stablecoins'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
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
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {filteredCurrencies.map((currency) => {
          const isSelected = selectedCrypto === currency.code

          return (
            <button
              key={currency.code}
              type="button"
              onClick={() => handleSelect(currency.code)}
              disabled={isLoading}
              className={`w-full p-3 rounded-lg border-2 transition-all duration-200 ${
                isSelected
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500 ring-offset-1'
                  : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-3">
                {/* Logo from NOWPayments */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                  <Image
                    src={currency.logoUrl}
                    alt={currency.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
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
                    <span className="font-semibold text-gray-900">
                      {currency.name}
                    </span>
                    {currency.isStable && (
                      <span className="text-xs px-1.5 py-0.5 bg-ukraine-blue-100 text-ukraine-blue-600 rounded">
                        Stablecoin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {getNetworkDisplayName(currency.network)}
                  </p>
                </div>

                {/* Checkmark for selected */}
                {isSelected && (
                  <div className="flex-shrink-0 text-emerald-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Minimum amount info / error */}
      {selectedCrypto && (
        <div className={`p-3 rounded-lg border ${
          isBelowMinimum
            ? 'bg-warm-50 border-warm-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-2">
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isBelowMinimum ? 'text-warm-600' : 'text-amber-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isBelowMinimum ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                      current: amount.toFixed(2)
                    })}
                  </span>
                ) : (
                  <span>
                    {t('cryptoSelector.minimumAmount', {
                      currency: selectedCurrencyInfo?.name || selectedCrypto,
                      amount: minAmount.toFixed(2)
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
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            canContinue
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="animate-spin h-5 w-5" />
              {t('cryptoSelector.creating')}
            </>
          ) : (
            <>
              {t('cryptoSelector.continue')}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('cryptoSelector.back')}
        </button>
      </div>
    </div>
  )
}
