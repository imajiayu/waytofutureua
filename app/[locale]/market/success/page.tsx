import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@/lib/supabase/server'
import { getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { MarketOrder } from '@/types/market'
import Link from 'next/link'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ order?: string }>
}

export default async function MarketSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { order: orderRef } = await searchParams
  const t = await getTranslations({ locale, namespace: 'market' })

  let order: MarketOrder | null = null

  if (orderRef) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // 验证订单归属：只查询当前用户的订单
      const { data } = await supabase
        .from('market_orders')
        .select('*')
        .eq('order_reference', orderRef)
        .eq('buyer_id', user.id)
        .single()
      order = data as MarketOrder | null
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center space-y-6">
        {/* 成功图标 */}
        <div className="w-20 h-20 mx-auto bg-life-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-life-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-display">
          {t('success.title')}
        </h1>

        <p className="text-gray-600">
          {t('success.description')}
        </p>

        {/* 订单详情 */}
        {order && (
          <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('order.orderReference')}</span>
              <span className="font-mono font-medium text-gray-900">{order.order_reference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('order.item')}</span>
              <span className="text-gray-900">
                {t('common.item')} #{order.item_id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('sale.quantity')}</span>
              <span className="font-data text-gray-900">{order.quantity}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
              <span className="text-gray-500 font-medium">{t('order.total')}</span>
              <span className="text-lg font-bold text-ukraine-blue-600 font-data">
                {formatMarketPrice(order.total_amount, 'USD')}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('order.shippingTo')}</span>
              <span className="text-gray-900 text-right">
                {order.shipping_name}<br />
                {order.shipping_city}, {order.shipping_country}
              </span>
            </div>
          </div>
        )}

        {/* 导航链接 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href={`/${locale}/market/orders`}
            className="px-6 py-3 bg-ukraine-blue-500 text-white rounded-lg font-semibold
                     hover:bg-ukraine-blue-600 transition-colors text-center"
          >
            {t('order.trackOrder')}
          </Link>
          <Link
            href={`/${locale}/market`}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium
                     hover:bg-gray-50 transition-colors text-center"
          >
            {t('success.continueBrowsing')}
          </Link>
        </div>
      </div>
    </main>
  )
}
