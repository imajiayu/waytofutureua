'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useMarketAuth } from '@/lib/hooks/useMarketAuth'
import { getMyOrders } from '@/app/actions/market-order'
import { getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { ORDER_STATUS_COLORS } from '@/lib/market/market-status'
import type { MarketOrder } from '@/types/market'
import EmailOTPForm from '@/components/market/EmailOTPForm'
import { SpinnerIcon } from '@/components/icons'
import Link from 'next/link'
import { useLocale } from 'next-intl'

export default function MarketOrdersPage() {
  const t = useTranslations('market')
  const locale = useLocale() as SupportedLocale
  const { isAuthenticated, isLoading: authLoading } = useMarketAuth()

  const [orders, setOrders] = useState<MarketOrder[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true)
      getMyOrders().then(({ orders: data }) => {
        setOrders(data)
        setIsLoading(false)
      })
    }
  }, [isAuthenticated])

  // 未认证 → 显示 OTP
  if (!authLoading && !isAuthenticated) {
    return (
      <main className="max-w-md mx-auto px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900 font-display text-center mb-8">
          {t('order.trackOrder')}
        </h1>
        <EmailOTPForm onSuccess={() => {}} />
      </main>
    )
  }

  // 加载中
  if (authLoading || isLoading) {
    return (
      <main className="flex items-center justify-center py-24">
        <SpinnerIcon className="animate-spin h-8 w-8 text-ukraine-blue-500" />
      </main>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 font-display mb-8">
        {t('order.myOrders')}
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">{t('order.noOrders')}</p>
          <Link
            href={`/${locale}/market`}
            className="mt-4 inline-block text-ukraine-blue-600 hover:text-ukraine-blue-800"
          >
            {t('success.continueBrowsing')}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const colors = ORDER_STATUS_COLORS[order.status]
            return (
              <div key={order.id} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-500">{order.order_reference}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                    {t(`status.${order.status}`)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">
                    {t('common.item')} #{order.item_id}
                  </span>
                  <span className="text-lg font-bold text-ukraine-blue-600 font-data">
                    {formatMarketPrice(order.total_amount, 'USD')}
                  </span>
                </div>

                {order.tracking_number && (
                  <div className="text-sm text-gray-500">
                    {t('order.trackingNumber')}: <span className="font-mono">{order.tracking_number}</span>
                    {order.tracking_carrier && ` (${order.tracking_carrier})`}
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleDateString()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
