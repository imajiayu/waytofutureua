'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { canPurchase } from '@/lib/market/market-status'
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

type Step = 'browse' | 'auth' | 'shipping' | 'processing' | 'payment'

const EMPTY_ADDRESS: ShippingAddress = {
  name: '', address_line1: '', city: '', postal_code: '', country: '',
}

export default function SaleCheckoutPanel({ item, locale }: SaleCheckoutPanelProps) {
  const t = useTranslations('market')
  const { isAuthenticated, isLoading: authLoading } = useMarketAuth()

  const [quantity, setQuantity] = useState(1)
  const [step, setStep] = useState<Step>('browse')
  const [shipping, setShipping] = useState<ShippingAddress>(EMPTY_ADDRESS)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentParams, setPaymentParams] = useState<Record<string, unknown> | null>(null)
  const [paymentAmount, setPaymentAmount] = useState(0)

  const price = item.fixed_price || 0
  const inStock = item.stock_quantity !== null && item.stock_quantity > 0
  const purchasable = canPurchase(item.status) && inStock

  const handleBuyClick = () => {
    if (!isAuthenticated) {
      setStep('auth')
    } else {
      setStep('shipping')
    }
  }

  const handleAuthSuccess = () => {
    setStep('shipping')
  }

  const handleCheckout = async () => {
    setError(null)
    setIsSubmitting(true)
    setStep('processing')

    const result = await createSaleOrder(item.id, quantity, shipping, locale)

    if (!result.success) {
      setIsSubmitting(false)
      setStep('shipping')
      setError(result.error === 'insufficient_stock'
        ? t('errors.insufficientStock')
        : result.error === 'not_authenticated'
        ? t('errors.notAuthenticated')
        : t('errors.checkoutFailed')
      )
      return
    }

    // 设置支付参数，进入支付步骤
    setPaymentParams(result.paymentParams!)
    setPaymentAmount(result.amount!)
    setIsSubmitting(false)
    setStep('payment')
  }

  // 认证步骤
  if (step === 'auth') {
    return (
      <div className="space-y-4">
        <EmailOTPForm
          onSuccess={handleAuthSuccess}
          onCancel={() => setStep('browse')}
        />
      </div>
    )
  }

  // 填写地址步骤
  if (step === 'shipping') {
    return (
      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-5">
        {/* 订单摘要 */}
        <div className="flex items-baseline justify-between pb-4 border-b border-gray-200">
          <span className="text-sm text-gray-500">
            {quantity} × {formatMarketPrice(price, item.currency)}
          </span>
          <span className="text-xl font-bold text-ukraine-blue-600 font-data">
            {formatMarketPrice(price * quantity, item.currency)}
          </span>
        </div>

        {error && (
          <div className="p-3 bg-warm-50 border border-warm-200 rounded-lg text-sm text-warm-700">
            {error}
          </div>
        )}

        <ShippingAddressForm
          value={shipping}
          onChange={setShipping}
          disabled={isSubmitting}
        />

        <div className="flex gap-3">
          <button
            onClick={() => { setStep('browse'); setError(null) }}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium
                     hover:bg-gray-50 transition-colors"
          >
            {t('common.back')}
          </button>
          <button
            onClick={handleCheckout}
            disabled={isSubmitting || !shipping.name || !shipping.address_line1 || !shipping.city || !shipping.postal_code || !shipping.country}
            className="flex-1 py-3 bg-ukraine-blue-500 text-white rounded-lg font-semibold
                     hover:bg-ukraine-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <SpinnerIcon className="animate-spin h-4 w-4" />}
            {t('checkout.pay')} — {formatMarketPrice(price * quantity, item.currency)}
          </button>
        </div>
      </div>
    )
  }

  // 处理中
  if (step === 'processing') {
    return (
      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center py-12 space-y-4">
        <SpinnerIcon className="animate-spin h-12 w-12 text-ukraine-blue-500" />
        <p className="text-gray-600">{t('checkout.processing')}</p>
      </div>
    )
  }

  // WayForPay 支付步骤
  if (step === 'payment' && paymentParams) {
    return (
      <MarketPaymentWidget
        paymentParams={paymentParams as Record<string, unknown> & { orderReference: string; returnUrl: string; currency: string }}
        amount={paymentAmount}
        locale={locale}
        onBack={() => { setStep('shipping'); setPaymentParams(null) }}
      />
    )
  }

  // 默认浏览步骤
  return (
    <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
      {/* 价格 */}
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-gray-500">{t('sale.price')}</span>
        <span className="text-2xl font-bold text-ukraine-blue-600 font-data">
          {formatMarketPrice(price, item.currency)}
        </span>
      </div>

      {/* 库存 */}
      <div className="text-sm text-gray-600">
        {inStock
          ? t('sale.inStock', { count: item.stock_quantity })
          : <span className="text-warm-600 font-medium">{t('sale.outOfStock')}</span>
        }
      </div>

      {/* 数量选择 */}
      {purchasable && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">{t('sale.quantity')}</label>
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
              disabled={quantity <= 1}
            >
              −
            </button>
            <span className="px-4 py-2 text-center font-medium min-w-[3rem] font-data">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(q => Math.min(item.stock_quantity || 99, q + 1))}
              className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              +
            </button>
          </div>
          <span className="text-sm text-gray-500 ml-auto font-data">
            {formatMarketPrice(price * quantity, item.currency)}
          </span>
        </div>
      )}

      {/* 购买按钮 */}
      <button
        onClick={handleBuyClick}
        disabled={!purchasable || authLoading}
        className="w-full py-3 bg-ukraine-blue-500 text-white rounded-lg font-semibold
                 hover:bg-ukraine-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                 transition-colors"
      >
        {purchasable ? t('sale.buyNow') : t('sale.outOfStock')}
      </button>
    </div>
  )
}
