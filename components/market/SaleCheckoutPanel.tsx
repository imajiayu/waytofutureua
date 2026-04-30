'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { createSaleOrder } from '@/app/actions/market-sale'
import { SpinnerIcon } from '@/components/icons'
import { useMarketAuth } from '@/lib/hooks/useMarketAuth'
import { canPurchase, getItemDisplayInfo } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { PublicMarketItem, ShippingAddress } from '@/types/market'

import EmailOTPForm from './EmailOTPForm'
import MarketPaymentWidget from './MarketPaymentWidget'
import ShippingAddressForm from './ShippingAddressForm'

interface SaleCheckoutPanelProps {
  item: PublicMarketItem
  locale: string
}

type Step = 'browse' | 'checkout' | 'processing' | 'payment'

const EMPTY_ADDRESS: ShippingAddress = {
  name: '',
  phone: '',
  address_line1: '',
  city: '',
  postal_code: '',
  country: '',
}

export default function SaleCheckoutPanel({ item, locale }: SaleCheckoutPanelProps) {
  const t = useTranslations('market')
  const { user, isAuthenticated, isLoading: authLoading } = useMarketAuth()

  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState<Step>('browse')
  const [shipping, setShipping] = useState<ShippingAddress>(EMPTY_ADDRESS)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submittingRef = useRef(false) // P2-5: ref-level mutex against double submit
  const [paymentParams, setPaymentParams] = useState<Record<string, unknown> | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)

  // Controls whether the OTP form is shown (for re-authentication / email change)
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Scroll to panel top when entering payment step (panel gets shorter)
  useEffect(() => {
    if (step === 'payment') {
      // Double rAF to wait for React render + browser paint
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      })
    }
  }, [step])

  const price = item.fixed_price || 0
  const { labelKey, hasStock, isSold } = getItemDisplayInfo(item.status, item.stock_quantity)
  const purchasable = canPurchase(item.status) && hasStock

  const handleBuyClick = () => {
    setStep('checkout')
  }

  const handleAuthSuccess = () => {
    setIsChangingEmail(false)
  }

  // ── Shipping field validation ──
  const [shippingErrors, setShippingErrors] = useState<
    Partial<Record<keyof ShippingAddress, string>>
  >({})

  const validateShipping = useCallback((): boolean => {
    const errs: Partial<Record<keyof ShippingAddress, string>> = {}
    if (!shipping.country) errs.country = t('shipping.errors.countryRequired')
    if (shipping.name.trim().length < 2) errs.name = t('shipping.errors.nameMin')
    if (shipping.phone.replace(/\D/g, '').length < 7) errs.phone = t('shipping.errors.phoneMin')
    if (shipping.address_line1.trim().length < 5)
      errs.address_line1 = t('shipping.errors.addressMin')
    if (shipping.city.trim().length < 2) errs.city = t('shipping.errors.cityMin')
    if (shipping.postal_code.trim().length < 3)
      errs.postal_code = t('shipping.errors.postalCodeMin')
    setShippingErrors(errs)
    return Object.keys(errs).length === 0
  }, [shipping, t])

  const handleCheckout = async () => {
    if (submittingRef.current) return // P2-5: ref-level guard
    if (!validateShipping()) return

    submittingRef.current = true
    setError(null)
    setIsSubmitting(true)
    setStep('processing')

    try {
      const result = await createSaleOrder(item.id, quantity, shipping, locale)

      if (!result.success) {
        setStep('checkout')
        setError(
          result.error === 'insufficient_stock'
            ? t('errors.insufficientStock')
            : result.error === 'not_authenticated'
              ? t('errors.notAuthenticated')
              : t('errors.checkoutFailed')
        )
        return
      }

      setPaymentParams(result.paymentParams!)
      setPaymentAmount(result.amount!)
      setStep('payment')
    } finally {
      submittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const showOTPForm = !isAuthenticated || isChangingEmail

  // ── Checkout step: email auth + shipping address ──
  if (step === 'checkout') {
    return (
      <div className="mkt-step-in">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Order summary header */}
          <div className="rounded-t-xl border-b border-gray-100 bg-gradient-to-r from-ukraine-blue-50/80 to-transparent px-5 py-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">
                {quantity} × {formatMarketPrice(price, item.currency)}
              </span>
              <span className="font-data text-xl font-bold text-ukraine-blue-600">
                {formatMarketPrice(price * quantity, item.currency)}
              </span>
            </div>
          </div>

          <div className="space-y-5 px-5 py-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-warm-200 bg-warm-50 p-3 text-sm text-warm-700"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-warm-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* ── Email section ── */}
            {showOTPForm ? (
              <div className="mkt-step-in">
                <EmailOTPForm
                  compact
                  onSuccess={handleAuthSuccess}
                  onCancel={
                    isChangingEmail
                      ? () => setIsChangingEmail(false)
                      : () => {
                          setStep('browse')
                          setError(null)
                        }
                  }
                  defaultEmail={isChangingEmail ? user?.email || '' : ''}
                />
              </div>
            ) : (
              <>
                {/* Authenticated email badge */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-ukraine-blue-100 bg-ukraine-blue-50/60 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <svg
                      className="h-4 w-4 shrink-0 text-ukraine-blue-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                      />
                    </svg>
                    <span className="truncate text-sm font-medium text-ukraine-blue-700">
                      {user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsChangingEmail(true)}
                    disabled={isSubmitting}
                    className="shrink-0 text-[13px] text-ukraine-blue-400 transition-colors hover:text-ukraine-blue-600"
                  >
                    {t('auth.changeEmail')}
                  </button>
                </div>

                {/* ── Shipping address form ── */}
                <div className="mkt-step-in">
                  <ShippingAddressForm
                    value={shipping}
                    onChange={(addr) => {
                      setShipping(addr)
                      // Clear errors for fields the user is editing
                      if (Object.keys(shippingErrors).length > 0) {
                        setShippingErrors((prev) => {
                          const next = { ...prev }
                          for (const key of Object.keys(next) as (keyof ShippingAddress)[]) {
                            if (addr[key] !== shipping[key]) delete next[key]
                          }
                          return next
                        })
                      }
                    }}
                    errors={shippingErrors}
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action buttons — only show when authenticated and not changing email */}
          {!showOTPForm && (
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => {
                  setStep('browse')
                  setError(null)
                }}
                disabled={isSubmitting}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                {t('common.back')}
              </button>
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ukraine-blue-500 py-3 font-semibold text-white shadow-lg shadow-ukraine-blue-500/20 transition-all hover:bg-ukraine-blue-600 hover:shadow-ukraine-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                {t('checkout.pay')} — {formatMarketPrice(price * quantity, item.currency)}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Processing step ──
  if (step === 'processing') {
    return (
      <div className="mkt-fade-in flex flex-col items-center justify-center space-y-4 rounded-xl border border-gray-200 bg-white py-16 shadow-sm">
        <div className="relative">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-gray-200 border-t-ukraine-blue-500" />
        </div>
        <p className="text-sm text-gray-500">{t('checkout.loading')}</p>
      </div>
    )
  }

  // ── Payment step ──
  if (step === 'payment' && paymentParams) {
    return (
      <div ref={panelRef} className="mkt-step-in">
        <MarketPaymentWidget
          paymentParams={
            paymentParams as Record<string, unknown> & {
              orderReference: string
              returnUrl: string
              currency: string
            }
          }
          amount={paymentAmount}
          locale={locale}
          onBack={() => {
            setStep('checkout')
            setPaymentParams(null)
          }}
        />
      </div>
    )
  }

  // ── Default browse step ──
  return (
    <div className="mkt-fade-in overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Price header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">{t('sale.price')}</span>
          <span className="font-data text-2xl font-bold text-ukraine-blue-600">
            {formatMarketPrice(price, item.currency)}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {/* Stock status */}
        <div className="flex items-center gap-2 text-sm">
          {purchasable ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-life-500" />
              <span className="text-gray-600">
                {t('sale.inStock', { count: item.stock_quantity })}
              </span>
            </>
          ) : isSold ? (
            <>
              <span className="h-2 w-2 rounded-full bg-warm-500" />
              <span className="font-medium text-warm-600">{t(labelKey)}</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              <span className="font-medium text-gray-500">{t(labelKey)}</span>
            </>
          )}
        </div>

        {/* Quantity selector */}
        {purchasable && (
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">{t('sale.quantity')}</label>
            <div className="flex items-center">
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-200">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label={t('sale.decreaseQuantity')}
                  className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="flex h-10 w-12 items-center justify-center border-x border-gray-200 bg-gray-50/50 font-data font-semibold">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(item.stock_quantity ?? 99, q + 1))}
                  aria-label={t('sale.increaseQuantity')}
                  className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  disabled={quantity >= (item.stock_quantity ?? 99)}
                >
                  +
                </button>
              </div>
              {quantity > 1 && (
                <span className="ml-3 font-data text-sm text-gray-400">
                  {formatMarketPrice(price * quantity, item.currency)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Buy button */}
        <button
          onClick={handleBuyClick}
          disabled={!purchasable || authLoading}
          className="group relative w-full overflow-hidden rounded-xl bg-ukraine-gold-400 py-3.5 text-[15px] font-bold text-ukraine-blue-900 transition-all duration-300 hover:bg-ukraine-gold-300 hover:shadow-lg hover:shadow-ukraine-gold-400/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Shimmer effect */}
          {purchasable && (
            <span className="absolute inset-0 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full" />
          )}
          <span className="relative">{purchasable ? t('sale.buyNow') : t(labelKey)}</span>
        </button>
      </div>
    </div>
  )
}
