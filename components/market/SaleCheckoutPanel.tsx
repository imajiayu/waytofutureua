'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { canPurchase, getItemDisplayInfo } from '@/lib/market/market-status'
import { useMarketAuth } from '@/lib/hooks/useMarketAuth'
import { createSaleOrder } from '@/app/actions/market-sale'
import type { PublicMarketItem, ShippingAddress } from '@/types/market'
import EmailOTPForm from './EmailOTPForm'
import ShippingAddressForm from './ShippingAddressForm'
import MarketPaymentWidget from './MarketPaymentWidget'
import { SpinnerIcon } from '@/components/icons'

interface SaleCheckoutPanelProps {
  item: PublicMarketItem
  locale: string
}

type Step = 'browse' | 'checkout' | 'processing' | 'payment'

const EMPTY_ADDRESS: ShippingAddress = {
  name: '', phone: '', address_line1: '', city: '', postal_code: '', country: '',
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
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({})

  const validateShipping = useCallback((): boolean => {
    const errs: Partial<Record<keyof ShippingAddress, string>> = {}
    if (!shipping.country) errs.country = t('shipping.errors.countryRequired')
    if (shipping.name.trim().length < 2) errs.name = t('shipping.errors.nameMin')
    if (shipping.phone.replace(/\D/g, '').length < 7) errs.phone = t('shipping.errors.phoneMin')
    if (shipping.address_line1.trim().length < 5) errs.address_line1 = t('shipping.errors.addressMin')
    if (shipping.city.trim().length < 2) errs.city = t('shipping.errors.cityMin')
    if (shipping.postal_code.trim().length < 3) errs.postal_code = t('shipping.errors.postalCodeMin')
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
        setError(result.error === 'insufficient_stock'
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Order summary header */}
          <div className="px-5 py-4 bg-gradient-to-r from-ukraine-blue-50/80 to-transparent border-b border-gray-100 rounded-t-xl">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">
                {quantity} × {formatMarketPrice(price, item.currency)}
              </span>
              <span className="text-xl font-bold text-ukraine-blue-600 font-data">
                {formatMarketPrice(price * quantity, item.currency)}
              </span>
            </div>
          </div>

          <div className="px-5 py-5 space-y-5">
            {error && (
              <div role="alert" className="p-3 bg-warm-50 border border-warm-200 rounded-lg text-sm text-warm-700 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0 text-warm-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
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
                  onCancel={isChangingEmail
                    ? () => setIsChangingEmail(false)
                    : () => { setStep('browse'); setError(null) }
                  }
                  defaultEmail={isChangingEmail ? (user?.email || '') : ''}
                />
              </div>
            ) : (
              <>
                {/* Authenticated email badge */}
                <div className="flex items-center justify-between gap-2 px-4 py-3 bg-ukraine-blue-50/60 border border-ukraine-blue-100 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg className="w-4 h-4 text-ukraine-blue-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    <span className="text-sm font-medium text-ukraine-blue-700 truncate">
                      {user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsChangingEmail(true)}
                    disabled={isSubmitting}
                    className="text-[13px] text-ukraine-blue-400 hover:text-ukraine-blue-600 transition-colors shrink-0"
                  >
                    {t('auth.changeEmail')}
                  </button>
                </div>

                {/* ── Shipping address form ── */}
                <div className="mkt-step-in">
                  <ShippingAddressForm
                    value={shipping}
                    onChange={addr => {
                      setShipping(addr)
                      // Clear errors for fields the user is editing
                      if (Object.keys(shippingErrors).length > 0) {
                        setShippingErrors(prev => {
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
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => { setStep('browse'); setError(null) }}
                disabled={isSubmitting}
                className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium
                         hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
              >
                {t('common.back')}
              </button>
              <button
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-ukraine-blue-500 text-white rounded-xl font-semibold
                         hover:bg-ukraine-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all flex items-center justify-center gap-2
                         shadow-lg shadow-ukraine-blue-500/20 hover:shadow-ukraine-blue-500/30"
              >
                {isSubmitting && <SpinnerIcon className="animate-spin h-4 w-4" />}
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 space-y-4
                     mkt-fade-in">
        <div className="relative">
          <div className="w-14 h-14 border-[3px] border-gray-200 border-t-ukraine-blue-500 rounded-full animate-spin" />
        </div>
        <p className="text-gray-500 text-sm">{t('checkout.loading')}</p>
      </div>
    )
  }

  // ── Payment step ──
  if (step === 'payment' && paymentParams) {
    return (
      <div ref={panelRef} className="mkt-step-in">
        <MarketPaymentWidget
          paymentParams={paymentParams as Record<string, unknown> & { orderReference: string; returnUrl: string; currency: string }}
          amount={paymentAmount}
          locale={locale}
          onBack={() => { setStep('checkout'); setPaymentParams(null) }}
        />
      </div>
    )
  }

  // ── Default browse step ──
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden
                   mkt-fade-in">
      {/* Price header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-gray-500">{t('sale.price')}</span>
          <span className="text-2xl font-bold text-ukraine-blue-600 font-data">
            {formatMarketPrice(price, item.currency)}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Stock status */}
        <div className="flex items-center gap-2 text-sm">
          {purchasable ? (
            <>
              <span className="w-2 h-2 rounded-full bg-life-500 animate-pulse" />
              <span className="text-gray-600">{t('sale.inStock', { count: item.stock_quantity })}</span>
            </>
          ) : isSold ? (
            <>
              <span className="w-2 h-2 rounded-full bg-warm-500" />
              <span className="text-warm-600 font-medium">{t(labelKey)}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-gray-500 font-medium">{t(labelKey)}</span>
            </>
          )}
        </div>

        {/* Quantity selector */}
        {purchasable && (
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">{t('sale.quantity')}</label>
            <div className="flex items-center">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  aria-label={t('sale.decreaseQuantity')}
                  className="w-10 h-10 flex items-center justify-center text-gray-500
                           hover:bg-gray-50 active:bg-gray-100 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="w-12 h-10 flex items-center justify-center font-semibold font-data border-x border-gray-200 bg-gray-50/50">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(q => Math.min(item.stock_quantity ?? 99, q + 1))}
                  aria-label={t('sale.increaseQuantity')}
                  className="w-10 h-10 flex items-center justify-center text-gray-500
                           hover:bg-gray-50 active:bg-gray-100 transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  disabled={quantity >= (item.stock_quantity ?? 99)}
                >
                  +
                </button>
              </div>
              {quantity > 1 && (
                <span className="ml-3 text-sm text-gray-400 font-data">
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
          className="relative w-full py-3.5 rounded-xl font-bold text-[15px] overflow-hidden
                   transition-all duration-300 group
                   disabled:opacity-50 disabled:cursor-not-allowed
                   bg-ukraine-gold-400 text-ukraine-blue-900
                   hover:bg-ukraine-gold-300 hover:shadow-lg hover:shadow-ukraine-gold-400/20
                   active:scale-[0.98]"
        >
          {/* Shimmer effect */}
          {purchasable && (
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent
                           -skew-x-12 -translate-x-full group-hover:translate-x-full
                           transition-transform duration-700 ease-in-out" />
          )}
          <span className="relative">
            {purchasable ? t('sale.buyNow') : t(labelKey)}
          </span>
        </button>
      </div>
    </div>
  )
}
