'use client'

import { useEffect, useRef, useState } from 'react'

import { clientLogger } from '@/lib/logger-client'

/**
 * Shared lifecycle hook for the WayForPay payment widget.
 *
 * Both `WayForPayWidget` (donation flow) and `MarketPaymentWidget` (market
 * checkout flow) ran the exact same script-load + run() + early-detection +
 * mobile-redirect-timeout state machine with 9 mirroring refs. This hook
 * encapsulates that state machine; the widget components only render UI.
 *
 * Behavior preservation requirements (0 business change):
 *   - script src + script.async + onload/onerror handlers byte-equal
 *   - 15s script-load timeout, 10s widget-open timeout, 100ms early-detect interval
 *   - duplicate `markAsFailed` suppression via `markedAsFailedRef`
 *   - `widgetEverDetectedRef` semantics: once detected, never reset
 *   - mobile branch: setIsRedirecting(true) + 10s timeout that only fires
 *     when `!hasRedirectedRef.current && !errorRef.current`
 *   - useEffect dependency is `[paymentParams]` only; option callbacks /
 *     error messages are accessed via a ref so locale/closure changes do not
 *     re-run the lifecycle (matches original behavior since onDeclined and
 *     onPending always set hasRedirectedRef before any timeout reads error)
 */

interface PaymentParams {
  orderReference: string
  returnUrl: string
  currency: string
  [key: string]: unknown
}

export interface WayForPayWidgetLifecycleOptions {
  paymentParams: PaymentParams
  /** DOM id used on the injected `<script>` tag — must differ between two widgets to avoid collision. */
  scriptId: string
  /** Log category for `clientLogger` calls produced inside the hook. */
  logCategory: 'WIDGET:WAYFORPAY' | 'WIDGET:MARKET'
  /** Server Action that flips the order/donation row to `widget_load_failed`. */
  markAsFailed: (orderReference: string) => Promise<unknown>
  /** Localized strings rendered by `setError(...)` in the various failure branches. */
  errorMessages: {
    paymentLoadFailed: string
    paymentFailed: string
    networkError: string
    popupBlocked: string
    /** WayForPay used `errors.serverError`; Market used `errors.paymentLoadFailed`. */
    initializationFailedFallback: string
  }
}

export interface WayForPayWidgetLifecycleResult {
  isLoading: boolean
  error: string | null
  isRedirecting: boolean
}

declare global {
  interface Window {
    Wayforpay: any
  }
}

/** Detect mobile devices (iOS/Android/etc.) — original implementation byte-equal. */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  // Detect iOS devices
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  // Detect Android and other mobile devices
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobileUA = /Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  return isIOS || isAndroid || isMobileUA
}

export function useWayForPayWidgetLifecycle(
  options: WayForPayWidgetLifecycleOptions
): WayForPayWidgetLifecycleResult {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  const errorRef = useRef<string | null>(null)
  const scriptLoadedRef = useRef(false)
  const scriptLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const widgetOpenCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const earlyDetectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const hasRedirectedRef = useRef(false)
  const widgetOpenedRef = useRef(false)
  const widgetEverDetectedRef = useRef(false)
  const widgetCheckCompletedRef = useRef(false)
  const markedAsFailedRef = useRef(false)

  // Keep latest options in a ref so the lifecycle effect can stay
  // dependency-stable on `paymentParams` only.
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Mirror error into errorRef for setTimeout closures (Market widget pattern).
  useEffect(() => {
    errorRef.current = error
  }, [error])

  useEffect(() => {
    const { paymentParams } = optionsRef.current

    const markAsFailed = async (reason: string) => {
      if (markedAsFailedRef.current) return
      markedAsFailedRef.current = true
      const { logCategory, markAsFailed: doMark, paymentParams: pp } = optionsRef.current
      clientLogger.warn(logCategory, 'Marking as widget_load_failed', { reason })

      try {
        await doMark(pp.orderReference)
      } catch (err) {
        clientLogger.error(logCategory, 'Failed to mark as widget_load_failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // Listen for iframe load errors (403, network errors, etc.)
    const handleWindowError = (event: ErrorEvent) => {
      // Check if error is related to WayForPay
      if (event.message && event.message.includes('wayforpay')) {
        const { logCategory, errorMessages } = optionsRef.current
        clientLogger.error(logCategory, 'Window error detected', { message: event.message })
        // Only mark as failed if widget was never detected (true load failure)
        if (
          !widgetOpenedRef.current &&
          !hasRedirectedRef.current &&
          !widgetEverDetectedRef.current
        ) {
          setError(errorMessages.paymentLoadFailed)
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
      const wfpOverlay = document.querySelector(
        '.wfp-overlay, .wayforpay-overlay, [class*="wfp-"], [id*="wayforpay"]'
      )
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
        const { errorMessages } = optionsRef.current
        setError(errorMessages.networkError)
        setIsLoading(false)
        markAsFailed('User is offline')
        return
      }

      const { scriptId, errorMessages } = optionsRef.current

      const script = document.createElement('script')
      script.src = 'https://secure.wayforpay.com/server/pay-widget.js'
      script.id = scriptId
      script.async = true

      // Set timeout for script loading (15 seconds)
      scriptLoadTimeoutRef.current = setTimeout(() => {
        if (!scriptLoadedRef.current) {
          setError(errorMessages.paymentLoadFailed)
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
        setError(errorMessages.paymentLoadFailed)
        setIsLoading(false)
        // Mark donation as widget_load_failed
        markAsFailed('Script load error')
      }

      document.body.appendChild(script)
    }

    const initializeWidget = () => {
      const { errorMessages, logCategory } = optionsRef.current

      if (!window.Wayforpay) {
        setError(errorMessages.paymentLoadFailed)
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
          function () {
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
            setError(response.reason || optionsRef.current.errorMessages.paymentFailed)
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
        if (!isMobileDevice()) {
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
                clientLogger.error(logCategory, 'Widget failed to open', {
                  message: 'No WayForPay elements detected after timeout',
                })
                setError(optionsRef.current.errorMessages.paymentLoadFailed)
                setIsLoading(false)
                setIsRedirecting(false)
                // Mark donation as widget_load_failed
                markAsFailed('Desktop: Widget not detected in DOM after 10s timeout')
              }
            }
          }, 10000)
        }

        // On mobile devices, show redirecting message
        if (isMobileDevice()) {
          setIsRedirecting(true)
          setIsLoading(false)

          // After 10 seconds, if still no redirect, show error
          setTimeout(() => {
            if (!hasRedirectedRef.current && !errorRef.current) {
              setIsRedirecting(false)
              setError(optionsRef.current.errorMessages.popupBlocked)
              // Mark as failed if widget never opened (popup likely blocked)
              if (!widgetOpenedRef.current && !widgetEverDetectedRef.current) {
                const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
                markAsFailed(
                  `Mobile: Redirect timeout after 10s - popup likely blocked (UA: ${userAgent.substring(0, 50)})`
                )
              }
            }
          }, 10000)
        } else {
          setIsLoading(false)
        }
      } catch (err) {
        clientLogger.error(logCategory, 'Widget initialization error', {
          error: err instanceof Error ? err.message : String(err),
        })
        setError(optionsRef.current.errorMessages.initializationFailedFallback)
        setIsLoading(false)
        setIsRedirecting(false)
        // Mark as failed - widget initialization threw an error
        markAsFailed(
          `Widget initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
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
  }, [options.paymentParams])

  return { isLoading, error, isRedirecting }
}
