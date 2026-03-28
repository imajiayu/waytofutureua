'use client'

import { useState, useEffect, Fragment } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useMarketAuth } from '@/lib/hooks/useMarketAuth'
import { getMyOrders } from '@/app/actions/market-order'
import { createClient } from '@/lib/supabase/client'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { ORDER_STATUS_COLORS } from '@/lib/market/market-status'
import type { MarketOrder, MarketOrderStatus } from '@/types/market'
import EmailOTPForm from '@/components/market/EmailOTPForm'
import OrderProofSection from '@/components/market/OrderProofSection'
import { SpinnerIcon } from '@/components/icons'

// ── 状态色条映射 ──────────────────────────────────
const ORDER_BORDER_COLORS: Record<MarketOrderStatus, string> = {
  pending:            'border-l-ukraine-gold-400',
  widget_load_failed: 'border-l-warm-400',
  paid:               'border-l-life-400',
  shipped:            'border-l-ukraine-blue-400',
  completed:          'border-l-life-500',
  expired:            'border-l-gray-300',
  declined:           'border-l-warm-400',
}

// ── 进度步骤 ──────────────────────────────────────
const PROGRESS_STEPS: MarketOrderStatus[] = ['paid', 'shipped', 'completed']
const FAILED_STATUSES: MarketOrderStatus[] = ['expired', 'declined', 'widget_load_failed']

// ── 点阵纹理 (与 market 主页一致) ─────────────────
const DOT_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='white'/%3E%3C/svg%3E\")"

export default function MarketOrdersPage() {
  const t = useTranslations('market')
  const locale = useLocale()
  const { user, isAuthenticated, isLoading: authLoading } = useMarketAuth()

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

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOrders([])
  }

  const showUserInfo = isAuthenticated && !authLoading

  return (
    <main data-compact-page>
      {/* ── 未认证/加载中：整页蓝色 + 居中卡片 ── */}
      {!showUserInfo ? (
        <section className="relative overflow-hidden bg-gradient-to-b from-ukraine-blue-900 via-ukraine-blue-800 to-ukraine-blue-700">
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: DOT_PATTERN }}
          />
          <div className="relative z-10 flex flex-col items-center px-4 pt-12 sm:pt-20 pb-16">
            {/* 标题 */}
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-white text-center">
              {t('order.myOrders')}
            </h1>
            {!authLoading && (
              <p className="mt-2 text-sm text-ukraine-blue-200/70 text-center">
                {t('auth.subtitle')}
              </p>
            )}

            {authLoading ? (
              <div className="mt-16">
                <SpinnerIcon className="animate-spin h-8 w-8 text-white/60" />
              </div>
            ) : (
              /* 认证表单 — 直接渲染在深色背景上 */
              <div className="w-full max-w-xs mt-8">
                <EmailOTPForm onSuccess={() => {}} compact dark />
              </div>
            )}
          </div>
        </section>

      ) : (
        <>
          {/* ── 已认证 Header ─────────────────────── */}
          <section className="relative overflow-hidden bg-gradient-to-br from-ukraine-blue-900 via-ukraine-blue-800 to-ukraine-blue-700">
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{ backgroundImage: DOT_PATTERN }}
            />
            <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
              <div className="flex items-end justify-between gap-4">
                {/* 左侧：返回 + 标题 */}
                <div>
                  <Link
                    href="/market"
                    className="inline-flex items-center gap-1 text-sm text-ukraine-blue-300/60 hover:text-ukraine-blue-200 transition-colors mb-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    {t('common.back')}
                  </Link>
                  <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
                    {t('order.myOrders')}
                  </h1>
                </div>
                {/* 右侧：用户邮箱 + 退出 */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm text-ukraine-blue-200/60 truncate max-w-[200px]">
                    {user?.email}
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="text-xs text-ukraine-blue-300/40 hover:text-ukraine-blue-200 transition-colors mt-0.5"
                  >
                    {t('order.signOut')}
                  </button>
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ukraine-gold-400/20 to-transparent" />
          </section>

          {/* ── 已认证 Content ──────────────────────── */}
          {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <SpinnerIcon className="animate-spin h-8 w-8 text-ukraine-blue-500" />
        </div>
      ) : orders.length === 0 ? (
        /* 空状态 */
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          <p className="text-lg text-gray-500">{t('order.noOrders')}</p>
          <Link
            href="/market"
            className="mt-4 inline-flex items-center gap-1.5 text-ukraine-blue-600 hover:text-ukraine-blue-800 font-medium transition-colors"
          >
            {t('success.continueBrowsing')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      ) : (
        /* 订单列表 */
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-4">
          {orders.map((order) => {
            const statusColors = ORDER_STATUS_COLORS[order.status]
            const borderColor = ORDER_BORDER_COLORS[order.status]
            const isFailed = FAILED_STATUSES.includes(order.status)
            const stepIndex = PROGRESS_STEPS.indexOf(order.status)
            const hasShippingInfo = order.shipping_name && order.shipping_city

            return (
              <article
                key={order.id}
                className={`bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 ${borderColor} p-5 space-y-3`}
              >
                {/* 行 1：订单号 + 状态徽章 */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-gray-500 truncate">
                    {order.order_reference}
                  </span>
                  <span
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text}`}
                  >
                    {t(`status.${order.status}`)}
                  </span>
                </div>

                {/* 进度条 (非失败 & 非 pending) */}
                {!isFailed && order.status !== 'pending' && (
                  <div className="flex items-center">
                    {PROGRESS_STEPS.map((step, i) => {
                      const reached = i <= stepIndex
                      const isActive = i === stepIndex
                      return (
                        <Fragment key={step}>
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                reached ? 'bg-life-500' : 'bg-gray-200'
                              } ${isActive ? 'ring-2 ring-life-500/20' : ''}`}
                            />
                            <span
                              className={`text-[11px] ${
                                reached ? 'text-gray-600 font-medium' : 'text-gray-400'
                              }`}
                            >
                              {t(`status.${step}`)}
                            </span>
                          </div>
                          {i < PROGRESS_STEPS.length - 1 && (
                            <div
                              className={`flex-1 h-px mx-2 ${
                                i < stepIndex ? 'bg-life-400' : 'bg-gray-200'
                              }`}
                            />
                          )}
                        </Fragment>
                      )
                    })}
                  </div>
                )}

                {/* 行 2：商品 + 金额 */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">
                    {t('order.item')} #{order.item_id}
                    {order.quantity > 1 && (
                      <span className="text-gray-500 ml-1">× {order.quantity}</span>
                    )}
                  </span>
                  <span className="text-lg font-bold text-ukraine-blue-600 font-data">
                    {formatMarketPrice(order.total_amount, 'USD')}
                  </span>
                </div>

                {/* 物流 + 收货信息 */}
                {(order.tracking_number || hasShippingInfo) && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-sm">
                    {order.tracking_number && (
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                        </svg>
                        <span className="font-mono">{order.tracking_number}</span>
                        {order.tracking_carrier && (
                          <span className="text-gray-400">({order.tracking_carrier})</span>
                        )}
                      </span>
                    )}
                    {hasShippingInfo && (
                      <span className="inline-flex items-center gap-1.5 text-gray-400">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                        {t('order.shippingTo')} {order.shipping_name}, {order.shipping_city}
                      </span>
                    )}
                  </div>
                )}

                {/* 证明文件 (shipped/completed) */}
                {['shipped', 'completed'].includes(order.status) && (
                  <OrderProofSection orderId={order.id} status={order.status} />
                )}

                {/* 日期 */}
                <div className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleDateString(
                    locale === 'ua' ? 'uk' : locale,
                    { year: 'numeric', month: 'short', day: 'numeric' }
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
        </>
      )}
    </main>
  )
}
