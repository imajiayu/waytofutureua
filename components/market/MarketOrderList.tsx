'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { getPublicMarketOrders } from '@/app/actions/market-items'
import { ORDER_STATUS_COLORS } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { PublicMarketOrderRecord, MarketOrderStatus } from '@/types/market'

interface Props {
  itemId: number
}

export default function MarketOrderList({ itemId }: Props) {
  const t = useTranslations('market.purchases')
  const tMarket = useTranslations('market')
  const locale = useLocale()
  const [orders, setOrders] = useState<PublicMarketOrderRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicMarketOrders(itemId).then(({ orders: data }) => {
      setOrders(data)
      setLoading(false)
    })
  }, [itemId])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold mb-4 font-display">{t('title')}</h2>
        <p className="text-gray-500 text-center py-6">{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-900 font-display">{t('title')}</h2>

      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('buyer')}</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('amount')}</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('quantity')}</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('status')}</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">{t('date')}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const colors = ORDER_STATUS_COLORS[order.status as MarketOrderStatus]
              return (
                <tr key={order.order_reference} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4 text-sm text-gray-600">{order.buyer_email_masked}</td>
                  <td className="py-4 px-4 text-sm font-medium text-gray-900 font-data">
                    {formatMarketPrice(order.total_amount, 'USD')}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">{order.quantity}</td>
                  <td className="py-4 px-4">
                    {colors && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {tMarket(`status.${order.status}`)}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString(
                      locale === 'ua' ? 'uk' : locale,
                      { year: 'numeric', month: 'short', day: 'numeric' }
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {orders.map(order => {
          const colors = ORDER_STATUS_COLORS[order.status as MarketOrderStatus]
          return (
            <div key={order.order_reference} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-900 font-data">
                  {formatMarketPrice(order.total_amount, 'USD')}
                  {order.quantity > 1 && <span className="text-gray-500 font-normal ml-1">× {order.quantity}</span>}
                </span>
                {colors && (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {tMarket(`status.${order.status}`)}
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs text-gray-500">
                <span>{order.buyer_email_masked}</span>
                <span>
                  {new Date(order.created_at).toLocaleDateString(
                    locale === 'ua' ? 'uk' : locale,
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-sm text-gray-600 text-center font-medium">
        {t('total', { count: orders.length })}
      </div>
    </div>
  )
}
