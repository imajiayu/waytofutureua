'use client'

import { useLocale, useTranslations } from 'next-intl'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'

import { getPublicMarketOrders } from '@/app/actions/market-items'
import { ORDER_STATUS_COLORS } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { MarketOrderStatus, PublicMarketOrderRecord } from '@/types/market'

const MarketProofViewer = lazy(() => import('./MarketProofViewer'))

const PROOF_STATUSES = ['shipped', 'completed']

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

interface Props {
  itemId: number
}

export default function MarketOrderList({ itemId }: Props) {
  const t = useTranslations('market.purchases')
  const tMarket = useTranslations('market')
  const locale = useLocale()
  const [orders, setOrders] = useState<PublicMarketOrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [viewProofOrder, setViewProofOrder] = useState<PublicMarketOrderRecord | null>(null)

  const intlLocale = locale === 'ua' ? 'uk' : locale
  const countryNames = useMemo(
    () => new Intl.DisplayNames([intlLocale], { type: 'region' }),
    [intlLocale]
  )

  useEffect(() => {
    setLoadError(false)
    getPublicMarketOrders(itemId)
      .then(({ orders: data, error }) => {
        if (error) {
          setLoadError(true)
          return
        }
        setOrders(data)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [itemId])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-1/4 rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 rounded bg-gray-200" />
            <div className="h-4 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h2 className="mb-4 font-display text-xl font-bold">{t('title')}</h2>
        <p className="py-4 text-gray-500">{t('loadError')}</p>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 font-display text-xl font-bold">{t('title')}</h2>
        <p className="py-6 text-center text-gray-500">{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-gray-900 md:mb-6 md:text-2xl">
        {t('title')}
      </h2>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('buyer')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('amount')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('quantity')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('status')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('date')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('updated')}</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                <span className="sr-only">{tMarket('proof.viewProof')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const colors = ORDER_STATUS_COLORS[order.status as MarketOrderStatus]
              const dateOpts: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }
              return (
                <tr
                  key={order.order_reference}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">{order.buyer_email_masked}</div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      {flagEmoji(order.shipping_country)}{' '}
                      {countryNames.of(order.shipping_country) || order.shipping_country}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-data text-sm font-medium text-gray-900">
                    {formatMarketPrice(order.total_amount, order.currency)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{order.quantity}</td>
                  <td className="px-4 py-4">
                    {colors && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {tMarket(`status.${order.status}`)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString(intlLocale, dateOpts)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {new Date(order.updated_at).toLocaleDateString(intlLocale, dateOpts)}
                  </td>
                  <td className="px-4 py-4">
                    {PROOF_STATUSES.includes(order.status) && (
                      <button
                        className="text-sm font-medium text-ukraine-blue-500 hover:text-ukraine-blue-600 hover:underline"
                        onClick={() => setViewProofOrder(order)}
                      >
                        {tMarket('proof.viewProof')}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-2 md:hidden">
        {orders.map((order) => {
          const colors = ORDER_STATUS_COLORS[order.status as MarketOrderStatus]
          const dateOpts: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }
          return (
            <div
              key={order.order_reference}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-data text-sm font-bold text-gray-900">
                  {formatMarketPrice(order.total_amount, order.currency)}
                  {order.quantity > 1 && (
                    <span className="ml-1 font-normal text-gray-500">× {order.quantity}</span>
                  )}
                </span>
                {colors && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                  >
                    {tMarket(`status.${order.status}`)}
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs text-gray-500">
                <span>
                  {order.buyer_email_masked}
                  <span className="ml-1.5">
                    {flagEmoji(order.shipping_country)}{' '}
                    {countryNames.of(order.shipping_country) || order.shipping_country}
                  </span>
                </span>
                <span>{new Date(order.created_at).toLocaleDateString(intlLocale, dateOpts)}</span>
              </div>
              {order.updated_at !== order.created_at && (
                <div className="mt-1 text-[11px] text-gray-400">
                  {t('updated')}:{' '}
                  {new Date(order.updated_at).toLocaleDateString(intlLocale, dateOpts)}
                </div>
              )}
              {PROOF_STATUSES.includes(order.status) && (
                <button
                  className="mt-2 text-xs font-medium text-ukraine-blue-500 hover:text-ukraine-blue-600 hover:underline"
                  onClick={() => setViewProofOrder(order)}
                >
                  {tMarket('proof.viewProof')}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 text-center text-sm font-medium text-gray-600">
        {t('total', { count: orders.length })}
      </div>

      {viewProofOrder && (
        <Suspense fallback={null}>
          <MarketProofViewer
            orderReference={viewProofOrder.order_reference}
            onClose={() => setViewProofOrder(null)}
          />
        </Suspense>
      )}
    </div>
  )
}
