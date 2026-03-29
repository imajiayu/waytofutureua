'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { markMarketOrderWidgetFailed, cancelMarketOrder } from '@/app/actions/market-sale'
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

export default function MarketPaymentWidget({ paymentParams, amount, locale, onBack }: Props) {
  const t = useTranslations('market')
  const tDonate = useTranslations('donate')
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
      if (scriptLoadedRef.current) { initializeWidget(); return }
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
          function () {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) clearTimeout(widgetOpenCheckTimeoutRef.current)
          },
          function (response: any) {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) clearTimeout(widgetOpenCheckTimeoutRef.current)
            hasRedirectedRef.current = true
            setError(response.reason || t('errors.paymentFailed'))
            setIsLoading(false)
            setIsRedirecting(false)
          },
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ── Header + Amount ── */}
      <div className="px-5 pt-6 pb-5 text-center border-b border-gray-100
                     bg-gradient-to-b from-ukraine-blue-50/60 to-transparent">
        <h2 className="text-lg font-bold text-gray-900 font-display">
          {t('checkout.paymentTitle')}
        </h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          {tWidget('windowOpening')}
        </p>
        <div className="inline-flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-ukraine-blue-600 font-data">
            ${amount.toFixed(2)}
          </span>
          <span className="text-sm font-medium text-ukraine-blue-400 font-data">
            {paymentParams.currency}
          </span>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* ── Loading ── */}
        {isLoading && (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 border-[3px] border-gray-200 border-t-ukraine-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{tWidget('preparing')}</p>
          </div>
        )}

        {/* ── Mobile redirecting ── */}
        {isRedirecting && !error && (
          <div className="p-4 bg-ukraine-blue-50 border border-ukraine-blue-200 rounded-xl">
            <div className="flex gap-3 items-start">
              <SpinnerIcon className="animate-spin h-5 w-5 text-ukraine-blue-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-ukraine-blue-800 mb-1">
                  {tWidget('redirecting.title')}
                </p>
                <p className="text-[13px] text-ukraine-blue-600 leading-relaxed">
                  {tWidget('redirecting.description')}
                </p>
                <p className="text-xs text-ukraine-blue-400 mt-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tWidget('redirecting.popupHint')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="p-4 bg-warm-50 border border-warm-200 rounded-xl">
            <div className="flex gap-3 items-start">
              <svg className="w-5 h-5 text-warm-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-warm-800 mb-1">
                  {tWidget('paymentFailed.title')}
                </p>
                <p className="text-[13px] text-warm-700 leading-relaxed">{error}</p>
                <p className="text-xs text-warm-600 mt-1.5">
                  {tWidget('paymentFailed.message')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── VPN / Firewall hint ── */}
        {!isLoading && !isRedirecting && !error && (
          <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl">
            <div className="flex gap-2.5 items-start">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126Z" />
              </svg>
              <p className="text-[13px] text-amber-700 leading-relaxed">
                {tDonate('networkNotice')}
              </p>
            </div>
          </div>
        )}

        {/* ── Modify & Retry button ── */}
        {!isLoading && onBack && (
          <button
            type="button"
            onClick={async () => {
              await cancelMarketOrder(paymentParams.orderReference)
              onBack()
            }}
            className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-medium text-sm
                     hover:bg-gray-50 hover:border-gray-300 transition-all
                     flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            {t('checkout.modifyAndRetry')}
          </button>
        )}

        {/* ── Security notice ── */}
        <div className="flex items-start gap-2.5 pt-1">
          <svg className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-xs text-gray-400 leading-relaxed">
            {tWidget('securePayment.description')}
          </p>
        </div>
      </div>
    </div>
  )
}
