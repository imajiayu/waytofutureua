'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { CreatePaymentResponse } from '@/lib/payment/nowpayments/types'
import { clientLogger } from '@/lib/logger-client'

interface Props {
  paymentData: CreatePaymentResponse
  amount: number // Original USD amount
  locale: string
  onBack?: () => void
  onStatusChange?: (status: string) => void
}

// Copy button component
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const t = useTranslations('nowpaymentsWidget')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      clientLogger.error('CLIPBOARD', 'Failed to copy', { error: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {t('addressCopied')}
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

// Format countdown time
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Status indicator component
function StatusIndicator({ status }: { status: string }) {
  const t = useTranslations('nowpaymentsWidget')

  const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
    waiting: {
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      icon: (
        <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    confirming: {
      color: 'text-ukraine-blue-600',
      bgColor: 'bg-ukraine-blue-50 border-ukraine-blue-200',
      icon: (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ),
    },
    confirmed: {
      color: 'text-ukraine-blue-600',
      bgColor: 'bg-ukraine-blue-50 border-ukraine-blue-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    sending: {
      color: 'text-ukraine-gold-700',
      bgColor: 'bg-ukraine-gold-50 border-ukraine-gold-200',
      icon: (
        <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    finished: {
      color: 'text-life-700',
      bgColor: 'bg-life-50 border-life-200',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
  }

  const config = statusConfig[status] || statusConfig.waiting
  const statusKey = status as keyof typeof statusConfig

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor}`}>
      <div className={`flex items-center gap-3 ${config.color}`}>
        {config.icon}
        <span className="font-medium">
          {t(`status.${statusKey}` as any)}
        </span>
      </div>
    </div>
  )
}

export default function NowPaymentsWidget({
  paymentData,
  amount,
  locale,
  onBack,
  onStatusChange,
}: Props) {
  const t = useTranslations('nowpaymentsWidget')

  const [currentStatus, setCurrentStatus] = useState(paymentData.payment_status)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  // Calculate initial countdown from expiration date
  useEffect(() => {
    if (paymentData.expiration_estimate_date) {
      const expirationTime = new Date(paymentData.expiration_estimate_date).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000))
      setCountdown(remaining)
    } else if (paymentData.valid_until) {
      const expirationTime = new Date(paymentData.valid_until).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expirationTime - now) / 1000))
      setCountdown(remaining)
    }
  }, [paymentData.expiration_estimate_date, paymentData.valid_until])

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          setIsExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // Notify parent of status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(currentStatus)
    }
  }, [currentStatus, onStatusChange])

  // Generate QR code URL (using a public QR service)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentData.pay_address)}`

  // Show expired state
  if (isExpired) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warm-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2 font-display">{t('expired')}</h2>
          <p className="text-sm text-gray-600">{t('expiredMessage')}</p>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToEdit')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-1 font-display">{t('title')}</h2>
        <p className="text-sm text-gray-600">{t('subtitle')}</p>
      </div>

      {/* Amount Display */}
      <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">{t('sendExactAmount')}</p>
          <p className="text-2xl font-bold text-emerald-600 font-data">
            {paymentData.pay_amount} {paymentData.pay_currency.toUpperCase()}
          </p>
          <p className="text-sm text-gray-500">
            ≈ ${amount.toFixed(2)} USD
          </p>
        </div>
      </div>

      {/* Wallet Address */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">{t('toAddress')}</p>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-data break-all text-gray-800 mb-2">
            {paymentData.pay_address}
          </p>
          <CopyButton text={paymentData.pay_address} label={t('copyAddress')} />
        </div>
      </div>

      {/* QR Code */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-gray-700">{t('scanQrCode')}</p>
        <div className="inline-block p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
          <img
            src={qrCodeUrl}
            alt={t('qrCodeAlt')}
            width={160}
            height={160}
            className="mx-auto"
          />
        </div>
      </div>

      {/* Status Indicator */}
      <StatusIndicator status={currentStatus} />

      {/* Countdown Timer */}
      {countdown !== null && countdown > 0 && (
        <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">{t('expiresIn')}</p>
          <p className="text-lg font-data font-bold text-gray-700">
            {formatCountdown(countdown)}
          </p>
        </div>
      )}

      {/* Estimated Time */}
      <p className="text-center text-sm text-gray-500">
        {t('estimatedTime')}
      </p>

      {/* Warning Box */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">{t('warning.title')}</p>
            <ul className="list-disc list-inside space-y-0.5 text-amber-700">
              <li>{t('warning.exactAmount')}</li>
              <li>{t('warning.singleTransaction')}</li>
              <li>{t('warning.correctNetwork')}</li>
              <li>{t('warning.noRefund')}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('backToEdit')}
        </button>
      )}

      {/* Security Notice */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">{t('securePayment.title')}</p>
            <p className="text-gray-600">{t('securePayment.description')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
