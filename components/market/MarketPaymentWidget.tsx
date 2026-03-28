'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { markMarketOrderWidgetFailed } from '@/app/actions/market-sale'
import { clientLogger } from '@/lib/logger-client'
import { SpinnerIcon } from '@/components/icons'

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

declare global {
  interface Window {
    Wayforpay: any
  }
}

const isMobile = () => {
  if (typeof navigator === 'undefined') return false
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobileUA = /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  return isIOS || isAndroid || isMobileUA
}

/**
 * 义卖支付 WayForPay Widget
 * 复用现有捐赠 WayForPayWidget 的核心逻辑，简化版本
 */
export default function MarketPaymentWidget({ paymentParams, amount, locale, onBack }: Props) {
  const t = useTranslations('market')
  const tWidget = useTranslations('wayforpayWidget')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const scriptLoadedRef = useRef(false)
  const scriptLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const widgetOpenCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const earlyDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasRedirectedRef = useRef(false)
  const widgetOpenedRef = useRef(false)
  const widgetEverDetectedRef = useRef(false)
  const widgetCheckCompletedRef = useRef(false)
  const markedAsFailedRef = useRef(false)

  useEffect(() => {
    // Mark order as widget_load_failed + rollback stock (with duplicate prevention)
    const markAsFailed = async (reason: string) => {
      if (markedAsFailedRef.current) return
      markedAsFailedRef.current = true
      clientLogger.warn('WIDGET:MARKET', 'Marking as widget_load_failed', { reason })

      try {
        await markMarketOrderWidgetFailed(paymentParams.orderReference)
      } catch (err) {
        clientLogger.error('WIDGET:MARKET', 'Failed to mark as widget_load_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Listen for iframe load errors (403, network errors, etc.)
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('wayforpay')) {
        clientLogger.error('WIDGET:MARKET', 'Window error detected', { message: event.message })
        if (!widgetOpenedRef.current && !hasRedirectedRef.current && !widgetEverDetectedRef.current) {
          setError(t('errors.paymentLoadFailed'))
          setIsLoading(false)
          setIsRedirecting(false)
          markAsFailed(`WayForPay iframe/script error: ${event.message}`)
        }
      }
    }

    // Check if WayForPay widget is open via DOM
    const checkWidgetOpened = () => {
      const wfpFrame = document.querySelector('iframe[src*="wayforpay"]')
      const wfpOverlay = document.querySelector('.wfp-overlay, .wayforpay-overlay, [class*="wfp-"], [id*="wayforpay"]')
      const wfpPopup = document.querySelector('[class*="wayforpay"], [class*="wfp"]')
      const isOpen = !!(wfpFrame || wfpOverlay || wfpPopup)
      if (isOpen) widgetEverDetectedRef.current = true
      return isOpen
    }

    window.addEventListener('error', handleWindowError, true)

    const loadWayForPayScript = () => {
      if (scriptLoadedRef.current) {
        initializeWidget()
        return
      }

      if (!navigator.onLine) {
        setError(tWidget('networkError'))
        setIsLoading(false)
        markAsFailed('User is offline')
        return
      }

      const script = document.createElement('script')
      script.src = 'https://secure.wayforpay.com/server/pay-widget.js'
      script.id = 'widget-wfp-script-market'
      script.async = true

      scriptLoadTimeoutRef.current = setTimeout(() => {
        if (!scriptLoadedRef.current) {
          setError(t('errors.paymentLoadFailed'))
          setIsLoading(false)
          markAsFailed('Script load timeout (15s)')
        }
      }, 15000)

      script.onload = () => {
        if (scriptLoadTimeoutRef.current) clearTimeout(scriptLoadTimeoutRef.current)
        scriptLoadedRef.current = true
        initializeWidget()
      }

      script.onerror = () => {
        if (scriptLoadTimeoutRef.current) clearTimeout(scriptLoadTimeoutRef.current)
        setError(t('errors.paymentLoadFailed'))
        setIsLoading(false)
        markAsFailed('Script load error')
      }

      document.body.appendChild(script)
    }

    const initializeWidget = () => {
      if (!window.Wayforpay) {
        setError(t('errors.paymentLoadFailed'))
        setIsLoading(false)
        markAsFailed('Wayforpay object not found after script load')
        return
      }

      try {
        const wayforpay = new window.Wayforpay()
        widgetOpenedRef.current = false

        wayforpay.run(
          paymentParams,
          // Success
          function () {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) clearTimeout(widgetOpenCheckTimeoutRef.current)
          },
          // Failed
          function (response: any) {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) clearTimeout(widgetOpenCheckTimeoutRef.current)
            hasRedirectedRef.current = true
            setError(response.reason || t('errors.paymentFailed'))
            setIsLoading(false)
            setIsRedirecting(false)
          },
          // Pending
          function (response: any) {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) clearTimeout(widgetOpenCheckTimeoutRef.current)
            if (response && response.orderReference) {
              hasRedirectedRef.current = true
              if (paymentParams.returnUrl) {
                window.location.href = paymentParams.returnUrl as string
              }
            }
          }
        )

        // Early detection: check DOM for widget elements
        const doEarlyCheck = () => {
          if (checkWidgetOpened()) {
            if (earlyDetectionIntervalRef.current) {
              clearInterval(earlyDetectionIntervalRef.current)
              earlyDetectionIntervalRef.current = null
            }
            return true
          }
          return false
        }

        setTimeout(() => doEarlyCheck(), 50)
        setTimeout(() => doEarlyCheck(), 150)
        earlyDetectionIntervalRef.current = setInterval(() => { if (doEarlyCheck()) return }, 100)
        setTimeout(() => {
          if (earlyDetectionIntervalRef.current) {
            clearInterval(earlyDetectionIntervalRef.current)
            earlyDetectionIntervalRef.current = null
          }
        }, 2000)

        // Desktop: 10s timeout to detect widget never appearing
        if (!isMobile()) {
          widgetOpenCheckTimeoutRef.current = setTimeout(() => {
            if (earlyDetectionIntervalRef.current) {
              clearInterval(earlyDetectionIntervalRef.current)
              earlyDetectionIntervalRef.current = null
            }
            if (widgetCheckCompletedRef.current) return
            widgetCheckCompletedRef.current = true

            if (!widgetOpenedRef.current && !hasRedirectedRef.current) {
              if (widgetEverDetectedRef.current) {
                widgetOpenedRef.current = true
              } else if (checkWidgetOpened()) {
                widgetOpenedRef.current = true
              } else {
                clientLogger.error('WIDGET:MARKET', 'Widget failed to open', {
                  message: 'No WayForPay elements detected after timeout',
                })
                setError(t('errors.paymentLoadFailed'))
                setIsLoading(false)
                setIsRedirecting(false)
                markAsFailed('Desktop: Widget not detected in DOM after 10s timeout')
              }
            }
          }, 10000)
        }

        if (isMobile()) {
          setIsRedirecting(true)
          setIsLoading(false)

          setTimeout(() => {
            if (!hasRedirectedRef.current && !error) {
              setIsRedirecting(false)
              setError(tWidget('popupBlocked'))
              if (!widgetOpenedRef.current && !widgetEverDetectedRef.current) {
                const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
                markAsFailed(`Mobile: Redirect timeout after 10s - popup likely blocked (UA: ${userAgent.substring(0, 50)})`)
              }
            }
          }, 10000)
        } else {
          setIsLoading(false)
        }
      } catch (err) {
        clientLogger.error('WIDGET:MARKET', 'Widget initialization error', {
          error: err instanceof Error ? err.message : String(err),
        })
        setError(t('errors.paymentLoadFailed'))
        setIsLoading(false)
        setIsRedirecting(false)
        markAsFailed(`Widget initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    loadWayForPayScript()

    return () => {
      window.removeEventListener('error', handleWindowError, true)
      if (scriptLoadTimeoutRef.current) clearTimeout(scriptLoadTimeoutRef.current)
      if (widgetOpenCheckTimeoutRef.current) clearTimeout(widgetOpenCheckTimeoutRef.current)
      if (earlyDetectionIntervalRef.current) clearInterval(earlyDetectionIntervalRef.current)
    }
  }, [paymentParams, t, tWidget])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2 font-display">{t('checkout.paymentTitle')}</h2>
        <p className="text-sm text-gray-600">
          {tWidget('windowOpening')}
        </p>
      </div>

      {/* Amount */}
      <div className="p-4 bg-ukraine-blue-50 rounded-lg border border-ukraine-blue-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">{t('checkout.total')}</p>
          <p className="text-3xl font-bold text-ukraine-blue-500 font-data">
            ${amount.toFixed(2)} {paymentParams.currency}
          </p>
        </div>
      </div>

      {/* Mobile redirecting */}
      {isRedirecting && !error && (
        <div className="p-5 bg-ukraine-blue-50 border-2 border-ukraine-blue-200 rounded-lg">
          <div className="flex gap-3 items-start">
            <SpinnerIcon className="animate-spin h-6 w-6 text-ukraine-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-base font-bold text-ukraine-blue-800 mb-2">
                {tWidget('redirecting.title')}
              </p>
              <p className="text-sm text-ukraine-blue-600">
                {tWidget('redirecting.description')}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-warm-50 border-2 border-warm-200 rounded-lg">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-warm-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-base font-bold text-warm-800 mb-2">
                {tWidget('paymentFailed.title')}
              </p>
              <p className="text-sm text-warm-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <SpinnerIcon className="animate-spin h-12 w-12 text-ukraine-blue-500" />
          <p className="text-gray-600 font-medium">{t('checkout.loading')}</p>
        </div>
      )}

      {!isLoading && onBack && (
        <button
          type="button"
          onClick={async () => {
            // 取消当前 pending 订单并回滚库存，防止 Back+Retry 重复扣减
            await markMarketOrderWidgetFailed(paymentParams.orderReference)
            onBack()
          }}
          className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold
                   hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t('common.back')}</span>
        </button>
      )}

      {/* Security Notice */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">{tWidget('securePayment.title')}</p>
            <p className="text-gray-600">{tWidget('securePayment.description')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
