import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { getTranslatedText } from '@/lib/i18n-utils'
import { getOrderStatusGroup, type OrderStatusGroup } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { createServerClient } from '@/lib/supabase/server'
import type { AppLocale } from '@/types'
import type { MarketOrder } from '@/types/market'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ order?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'market' })
  return {
    title: t('success.confirmed.title'),
    robots: { index: false, follow: false },
  }
}

// 状态分组对应的图标和颜色（含 sessionExpired）
type StatusGroupKey = OrderStatusGroup | 'sessionExpired'
const STATUS_GROUP_STYLES: Record<
  StatusGroupKey,
  {
    iconBg: string
    iconColor: string
    icon: 'check' | 'clock' | 'x'
  }
> = {
  processing: { iconBg: 'bg-ukraine-gold-100', iconColor: 'text-ukraine-gold-600', icon: 'clock' },
  success: { iconBg: 'bg-life-100', iconColor: 'text-life-600', icon: 'check' },
  failed: { iconBg: 'bg-warm-100', iconColor: 'text-warm-600', icon: 'x' },
  sessionExpired: { iconBg: 'bg-gray-100', iconColor: 'text-gray-500', icon: 'clock' },
}

export default async function MarketSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { order: orderRef } = await searchParams
  const t = await getTranslations({ locale, namespace: 'market' })

  let order: MarketOrder | null = null
  let sessionExpired = false

  if (orderRef) {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // 验证订单归属：只查询当前用户的订单
      const { data } = await supabase
        .from('market_orders')
        .select('*, market_items(title_i18n)')
        .eq('order_reference', orderRef)
        .eq('buyer_id', user.id)
        .single()
      order = data as
        | (MarketOrder & { market_items?: { title_i18n: Record<string, string> } })
        | null
    } else {
      // P2-7: 区分 session 过期 — 用户未登录但有 orderRef
      sessionExpired = true
    }
  }

  // 根据订单状态确定分组
  const statusGroup = sessionExpired
    ? ('sessionExpired' as const)
    : order
      ? getOrderStatusGroup(order.status)
      : 'processing'
  const style = STATUS_GROUP_STYLES[statusGroup]

  // 状态分组对应的翻译键前缀
  const groupKey = statusGroup === 'success' ? 'confirmed' : (statusGroup as string)

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="space-y-6 text-center">
        {/* 状态图标 */}
        <div
          className={`mx-auto h-20 w-20 ${style.iconBg} flex items-center justify-center rounded-full`}
        >
          {style.icon === 'check' && (
            <svg
              className={`h-10 w-10 ${style.iconColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {style.icon === 'clock' && (
            <svg
              className={`h-10 w-10 ${style.iconColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          {style.icon === 'x' && (
            <svg
              className={`h-10 w-10 ${style.iconColor}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
          {t(`success.${groupKey}.title`)}
        </h1>

        <p className="text-gray-600">{t(`success.${groupKey}.description`)}</p>

        {/* 邮件提醒（processing 和 success 显示，需要有订单邮箱） */}
        {order && statusGroup === 'processing' && (
          <p className="rounded-lg bg-ukraine-gold-50 px-4 py-3 text-sm text-ukraine-gold-700">
            {t('success.processing.emailReminder', { email: order.buyer_email })}
          </p>
        )}
        {order && statusGroup === 'success' && (
          <p className="rounded-lg bg-life-50 px-4 py-3 text-sm text-life-700">
            {t('success.confirmed.emailSent', { email: order.buyer_email })}
          </p>
        )}

        {/* 订单详情 */}
        {order && (
          <div className="mt-8 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-6 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('order.orderReference')}</span>
              <span className="font-mono font-medium text-gray-900">{order.order_reference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('order.item')}</span>
              <span className="text-gray-900">
                {(order as any).market_items?.title_i18n
                  ? getTranslatedText(
                      (order as any).market_items.title_i18n,
                      null,
                      locale as AppLocale
                    )
                  : `${t('order.item')} #${order.item_id}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('sale.quantity')}</span>
              <span className="font-data text-gray-900">{order.quantity}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3 text-sm">
              <span className="font-medium text-gray-500">{t('order.total')}</span>
              <span className="font-data text-lg font-bold text-ukraine-blue-600">
                {formatMarketPrice(order.total_amount, order.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('order.shippingTo')}</span>
              <span className="text-right text-gray-900">
                {order.shipping_name}
                <br />
                {order.shipping_city}, {order.shipping_country}
              </span>
            </div>
          </div>
        )}

        {/* 导航链接 */}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/market/orders"
            className="rounded-xl bg-ukraine-blue-500 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-ukraine-blue-600"
          >
            {t('order.trackOrder')}
          </Link>
          <Link
            href="/market"
            className="rounded-xl border border-gray-300 px-6 py-3 text-center font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t('success.continueBrowsing')}
          </Link>
        </div>
      </div>
    </main>
  )
}
