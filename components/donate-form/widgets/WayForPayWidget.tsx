'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { markDonationWidgetFailed } from '@/app/actions/donation'
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

// Declare WayForPay on window object
declare global {
  interface Window {
    Wayforpay: any
  }
}

// Helper function to detect mobile devices (iOS, Android, etc.)
const isMobile = () => {
  if (typeof navigator === 'undefined') return false
  // Detect iOS devices
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // Detect Android and other mobile devices
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobileUA = /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  return isIOS || isAndroid || isMobileUA
}

export default function WayForPayWidget({ paymentParams, amount, locale, onBack }: Props) {
  const t = useTranslations('donate')
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
  const widgetEverDetectedRef = useRef(false) // Track if widget was ever detected in DOM
  const widgetCheckCompletedRef = useRef(false) // Prevent duplicate checks from multiple useEffect runs
  const markedAsFailedRef = useRef(false) // Prevent duplicate widget_load_failed calls

  useEffect(() => {
    // Helper function to mark donation as failed (with duplicate prevention)
    const markAsFailed = async (reason: string) => {
      if (markedAsFailedRef.current) {
        return
      }
      markedAsFailedRef.current = true
      clientLogger.warn('WIDGET:WAYFORPAY', 'Marking as widget_load_failed', { reason })

      try {
        await markDonationWidgetFailed(paymentParams.orderReference)
      } catch (err) {
        clientLogger.error('WIDGET:WAYFORPAY', 'Failed to mark as widget_load_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Listen for iframe load errors (403, network errors, etc.)
    const handleWindowError = (event: ErrorEvent) => {
      // Check if error is related to WayForPay
      if (event.message && event.message.includes('wayforpay')) {
        clientLogger.error('WIDGET:WAYFORPAY', 'Window error detected', { message: event.message })
        // Only mark as failed if widget was never detected (true load failure)
        if (!widgetOpenedRef.current && !hasRedirectedRef.current && !widgetEverDetectedRef.current) {
          setError(t('errors.paymentLoadFailed'))
          setIsLoading(false)
          setIsRedirecting(false)
          markAsFailed(`WayForPay iframe/script error: ${event.message}`)
        }
      }
    }

    // Helper function to check if WayForPay widget is open
    const checkWidgetOpened = () => {
      // WayForPay creates elements with specific classes/ids when widget opens
      const wfpFrame = document.querySelector('iframe[src*="wayforpay"]')
      const wfpOverlay = document.querySelector('.wfp-overlay, .wayforpay-overlay, [class*="wfp-"], [id*="wayforpay"]')
      const wfpPopup = document.querySelector('[class*="wayforpay"], [class*="wfp"]')
      const isOpen = !!(wfpFrame || wfpOverlay || wfpPopup)
      // Once detected, remember it permanently (widget may be closed later by user)
      if (isOpen) {
        widgetEverDetectedRef.current = true
      }
      return isOpen
    }

    window.addEventListener('error', handleWindowError, true)

    // Load WayForPay widget script
    const loadWayForPayScript = () => {
      if (scriptLoadedRef.current) {
        initializeWidget()
        return
      }

      // Check if we're online
      if (!navigator.onLine) {
        const offlineError = tWidget('networkError')
        setError(offlineError)
        setIsLoading(false)
        markAsFailed('User is offline')
        return
      }

      const script = document.createElement('script')
      script.src = 'https://secure.wayforpay.com/server/pay-widget.js'
      script.id = 'widget-wfp-script'
      script.async = true

      // Set timeout for script loading (15 seconds)
      scriptLoadTimeoutRef.current = setTimeout(() => {
        if (!scriptLoadedRef.current) {
          setError(t('errors.paymentLoadFailed'))
          setIsLoading(false)
          // Mark donation as widget_load_failed
          markAsFailed('Script load timeout (15s)')
        }
      }, 15000)

      script.onload = () => {
        if (scriptLoadTimeoutRef.current) {
          clearTimeout(scriptLoadTimeoutRef.current)
        }
        scriptLoadedRef.current = true
        initializeWidget()
      }

      script.onerror = () => {
        if (scriptLoadTimeoutRef.current) {
          clearTimeout(scriptLoadTimeoutRef.current)
        }
        setError(t('errors.paymentLoadFailed'))
        setIsLoading(false)
        // Mark donation as widget_load_failed
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

        // Clear widget opened flag
        widgetOpenedRef.current = false

        wayforpay.run(
          paymentParams,
          // Success callback
          function (response: any) {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) {
              clearTimeout(widgetOpenCheckTimeoutRef.current)
            }
            // Redirect is handled by returnUrl in paymentParams
          },
          // Failed callback
          function (response: any) {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) {
              clearTimeout(widgetOpenCheckTimeoutRef.current)
            }
            hasRedirectedRef.current = true
            setError(response.reason || t('errors.paymentFailed'))
            setIsLoading(false)
            setIsRedirecting(false)
          },
          // Pending callback
          function (response: any) {
            widgetOpenedRef.current = true
            if (widgetOpenCheckTimeoutRef.current) {
              clearTimeout(widgetOpenCheckTimeoutRef.current)
            }
            if (response && response.orderReference) {
              // User completed payment action, redirect to success page
              hasRedirectedRef.current = true
              if (paymentParams.returnUrl) {
                window.location.href = paymentParams.returnUrl
              }
            }
            // Note: If user closes window without payment, donation stays 'pending'
            // WayForPay will send 'Expired' webhook after timeout period
          }
        )

        // Early detection: check for widget DOM elements frequently
        // Start with immediate check, then every 100ms for the first 2 seconds
        // This helps detect widget opening even if user closes it quickly
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

        // Immediate check after run() is called
        setTimeout(() => doEarlyCheck(), 50)
        setTimeout(() => doEarlyCheck(), 150)

        // Then check every 100ms
        earlyDetectionIntervalRef.current = setInterval(() => {
          if (doEarlyCheck()) return
        }, 100)

        // Stop early detection after 2 seconds (widget should definitely be open by then)
        setTimeout(() => {
          if (earlyDetectionIntervalRef.current) {
            clearInterval(earlyDetectionIntervalRef.current)
            earlyDetectionIntervalRef.current = null
          }
        }, 2000)

        // Check if widget opened successfully after a delay (10 seconds)
        // This gives WayForPay time to create its DOM elements
        // IMPORTANT: Skip this check on mobile devices - they use redirect mode and won't have DOM elements
        if (!isMobile()) {
          widgetOpenCheckTimeoutRef.current = setTimeout(() => {
            if (earlyDetectionIntervalRef.current) {
              clearInterval(earlyDetectionIntervalRef.current)
              earlyDetectionIntervalRef.current = null
            }

            // Skip if check already completed (prevents duplicate runs from React Strict Mode or re-renders)
            if (widgetCheckCompletedRef.current) {
              return
            }
            widgetCheckCompletedRef.current = true

            if (!widgetOpenedRef.current && !hasRedirectedRef.current) {
              // First check if widget was ever detected (user may have closed it)
              if (widgetEverDetectedRef.current) {
                widgetOpenedRef.current = true
                // Don't mark as failed - donation stays pending, WayForPay will handle expiration
              } else if (checkWidgetOpened()) {
                // Check DOM for WayForPay elements
                widgetOpenedRef.current = true
              } else {
                // Widget never appeared - true load failure
                clientLogger.error('WIDGET:WAYFORPAY', 'Widget failed to open', {
                  message: 'No WayForPay elements detected after timeout',
                })
                setError(t('errors.paymentLoadFailed'))
                setIsLoading(false)
                setIsRedirecting(false)
                // Mark donation as widget_load_failed
                markAsFailed('Desktop: Widget not detected in DOM after 10s timeout')
              }
            }
          }, 10000)
        }

        // On mobile devices, show redirecting message
        if (isMobile()) {
          setIsRedirecting(true)
          setIsLoading(false)

          // After 10 seconds, if still no redirect, show error
          setTimeout(() => {
            if (!hasRedirectedRef.current && !error) {
              setIsRedirecting(false)
              setError(tWidget('popupBlocked'))
              // Mark as failed if widget never opened (popup likely blocked)
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
        clientLogger.error('WIDGET:WAYFORPAY', 'Widget initialization error', {
          error: err instanceof Error ? err.message : String(err),
        })
        setError(t('errors.serverError'))
        setIsLoading(false)
        setIsRedirecting(false)
        // Mark as failed - widget initialization threw an error
        markAsFailed(`Widget initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    loadWayForPayScript()

    // Cleanup
    return () => {
      window.removeEventListener('error', handleWindowError, true)
      if (scriptLoadTimeoutRef.current) {
        clearTimeout(scriptLoadTimeoutRef.current)
      }
      if (widgetOpenCheckTimeoutRef.current) {
        clearTimeout(widgetOpenCheckTimeoutRef.current)
      }
      if (earlyDetectionIntervalRef.current) {
        clearInterval(earlyDetectionIntervalRef.current)
      }
    }
  }, [paymentParams, t, tWidget])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2 font-display">{t('payment.title')}</h2>
        <p className="text-sm text-gray-600">
          {tWidget('windowOpening')}
        </p>
      </div>

      {/* Amount Display */}
      <div className="p-4 bg-ukraine-blue-50 rounded-lg border border-ukraine-blue-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">
            {t('payment.total')}
          </p>
          <p className="text-3xl font-bold text-ukraine-blue-500 font-data">
            ${amount.toFixed(2)} {paymentParams.currency}
          </p>
        </div>
      </div>

      {/* Redirecting State - Mobile devices */}
      {isRedirecting && !error && (
        <div className="p-5 bg-ukraine-blue-50 border-2 border-ukraine-blue-200 rounded-lg">
          <div className="flex gap-3 items-start">
            <SpinnerIcon className="animate-spin h-6 w-6 text-ukraine-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-base font-bold text-ukraine-blue-800 mb-2">
                {tWidget('redirecting.title')}
              </p>
              <p className="text-sm text-ukraine-blue-600 mb-3">
                {tWidget('redirecting.description')}
              </p>
              <div className="flex items-center gap-2 text-xs text-ukraine-blue-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {tWidget('redirecting.popupHint')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-5 bg-warm-50 border-2 border-warm-200 rounded-lg">
          <div className="flex gap-3 mb-4">
            <svg className="w-6 h-6 text-warm-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-base font-bold text-warm-800 mb-2">
                {tWidget('paymentFailed.title')}
              </p>
              <p className="text-sm text-warm-700 mb-3">{error}</p>
              <p className="text-xs text-warm-600">
                {tWidget('paymentFailed.message')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <SpinnerIcon className="animate-spin h-12 w-12 text-ukraine-blue-500" />
          <p className="text-gray-600 font-medium">{t('payment.loading')}</p>
          <p className="text-sm text-gray-500">
            {tWidget('preparing')}
          </p>
        </div>
      )}

      {/* Back Button - Always show when not loading */}
      {!isLoading && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>
            {tWidget('backToEdit')}
          </span>
        </button>
      )}

      {/* Security Notice */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">
              {tWidget('securePayment.title')}
            </p>
            <p className="text-gray-600">
              {tWidget('securePayment.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
