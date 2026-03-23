'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { trackDonations, requestRefund } from '@/app/actions/track-donation'
import { Link } from '@/i18n/navigation'
import { SearchIcon, MailIcon, HashIcon, ArrowRightIcon, ExternalLinkIcon, CheckCircle2Icon, AlertTriangleIcon } from '@/components/icons'
import DonationResultViewer from '@/components/donation-display/DonationResultViewer'
import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import { getProjectName, getUnitName, formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import type { I18nText } from '@/types'
import { clientLogger } from '@/lib/logger-client'
import {
  canViewResult,
  canRequestRefund,
  isRefundPending,
  type DonationStatus
} from '@/lib/donation-status'

type Donation = {
  id: number
  donation_public_id: string
  order_reference: string
  donor_email: string
  amount: number
  currency: string
  donation_status: DonationStatus
  donated_at: string
  updated_at: string
  projects: {
    id: number
    project_name: string
    project_name_i18n: I18nText | null
    unit_name: string
    unit_name_i18n: I18nText | null
    aggregate_donations: boolean | null
  }
}

type Props = {
  locale: string
}

export default function TrackDonationForm({ locale }: Props) {
  const t = useTranslations('trackDonation')
  const searchParams = useSearchParams()

  // 从 URL 参数初始化表单值
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [donationId, setDonationId] = useState(searchParams.get('id') || '')
  const [donations, setDonations] = useState<Donation[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null)
  const [viewResultDonationId, setViewResultDonationId] = useState<string | null>(null)

  // 用于追踪上次自动查询的参数，避免重复查询
  const lastAutoQueryParams = useRef<{ email: string; id: string } | null>(null)

  // 如果 URL 有参数，自动触发查询（仅在参数改变或首次加载时）
  useEffect(() => {
    const urlEmail = searchParams.get('email')
    const urlId = searchParams.get('id')

    // 如果 URL 没有参数，跳过
    if (!urlEmail || !urlId) return

    // 如果已经有查询结果且参数未变，跳过（防止切换语言时重复查询）
    if (
      donations &&
      lastAutoQueryParams.current?.email === urlEmail &&
      lastAutoQueryParams.current?.id === urlId
    ) {
      return
    }

    // 记录本次查询参数
    lastAutoQueryParams.current = { email: urlEmail, id: urlId }

    handleAutoQuery(urlEmail, urlId)
  }, [searchParams, donations])

  // 自动查询函数
  async function handleAutoQuery(queryEmail: string, queryId: string) {
    setError('')
    setDonations(null)
    setLoading(true)

    try {
      const result = await trackDonations({ email: queryEmail, donationId: queryId })
      if (result.error) {
        setError(t(`errors.${result.error}`))
      } else if (result.donations) {
        setDonations(result.donations as Donation[])
      }
    } catch (err) {
      setError(t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  // Lock body scroll when confirmation dialog is open
  useEffect(() => {
    if (!confirmRefundId) return

    // Save current scroll position
    const scrollY = window.scrollY

    // Prevent scrolling
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    return () => {
      // Restore scrolling
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''

      // Restore scroll position
      window.scrollTo(0, scrollY)
    }
  }, [confirmRefundId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setDonations(null)
    setLoading(true)

    try {
      const result = await trackDonations({ email, donationId })
      if (result.error) {
        setError(t(`errors.${result.error}`))
      } else if (result.donations) {
        setDonations(result.donations as Donation[])
        // 查询成功后更新 URL，这样切换语言时能保留查询参数
        const url = new URL(window.location.href)
        url.searchParams.set('email', email)
        url.searchParams.set('id', donationId)
        window.history.replaceState({}, '', url.toString())
        // 同时更新 lastAutoQueryParams，防止 useEffect 重复查询
        lastAutoQueryParams.current = { email, id: donationId }
      }
    } catch (err) {
      setError(t('errors.serverError'))
    } finally {
      setLoading(false)
    }
  }

  function handleRequestRefund(orderReference: string) {
    // Get a REFUNDABLE donation ID from this order for verification
    // Must be paid/confirmed/delivering status, NOT completed
    const refundableDonation = donations?.find(d =>
      d.order_reference === orderReference &&
      canRequestRefund(d.donation_status)
    )
    if (!refundableDonation) {
      setError(t('errors.cannotRefundCompleted'))
      return
    }

    // 立即关闭确认窗口
    setConfirmRefundId(null)
    setError('')

    // 立即更新UI为"refunding"状态（乐观更新）- 只更新可退款的记录
    setDonations(prev =>
      prev ? prev.map(d =>
        d.order_reference === orderReference &&
        canRequestRefund(d.donation_status)
          ? { ...d, donation_status: 'refunding' as DonationStatus }
          : d
      ) : null
    )

    // 异步发送退款请求（不阻塞UI）
    requestRefund({
      donationPublicId: refundableDonation.donation_public_id,
      email,
    }).then(result => {
      if (result.error) {
        // 退款失败，显示错误并恢复原状态
        setError(t(`errors.${result.error}`))
        // 重新查询获取正确的状态
        trackDonations({ email, donationId: refundableDonation.donation_public_id }).then(trackResult => {
          if (trackResult.donations) {
            setDonations(trackResult.donations)
          }
        })
      } else if (result.success) {
        // 退款成功，只更新可退款的记录为实际状态
        const newStatus = (result as any).status || 'refund_processing'
        setDonations(prev =>
          prev ? prev.map(d =>
            d.order_reference === orderReference &&
            (canRequestRefund(d.donation_status) || d.donation_status === 'refunding')
              ? { ...d, donation_status: newStatus as DonationStatus }
              : d
          ) : null
        )
      }
    }).catch(err => {
      clientLogger.error('API', 'Refund request failed', { error: err instanceof Error ? err.message : String(err) })
      setError(t('errors.serverError'))
      // 重新查询获取正确的状态
      trackDonations({ email, donationId: refundableDonation.donation_public_id }).then(trackResult => {
        if (trackResult.donations) {
          setDonations(trackResult.donations)
        }
      })
    })
  }


  return (
    <div className="pb-20">
      {/* Search Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-12 border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <MailIcon className="w-4 h-4 text-ukraine-blue-500" />
                  {t('form.email')}
                </div>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent transition-all outline-none hover:border-gray-400 text-gray-900 placeholder:text-gray-400"
                placeholder={t('form.emailPlaceholder')}
              />
            </div>

            {/* Donation ID Input */}
            <div>
              <label htmlFor="donationId" className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <HashIcon className="w-4 h-4 text-ukraine-blue-500" />
                  {t('form.donationId')}
                </div>
              </label>
              <input
                id="donationId"
                type="text"
                value={donationId}
                onChange={(e) => setDonationId(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent transition-all outline-none hover:border-gray-400 text-gray-900 placeholder:text-gray-400"
                placeholder={t('form.donationIdPlaceholder')}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full bg-ukraine-gold-500 text-ukraine-blue-900 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:bg-ukraine-gold-600 transform hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            {loading ? (
              <>
                <div className="relative z-10 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="relative z-10">{t('form.searching')}</span>
              </>
            ) : (
              <>
                <SearchIcon className="relative z-10 w-5 h-5" />
                <span className="relative z-10">{t('form.submit')}</span>
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-warm-50 border-l-4 border-warm-500 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-warm-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="ml-3 text-sm text-warm-700 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {donations && donations.length > 0 && (() => {
        // Group donations by order_reference
        const orderGroups = donations.reduce((acc, donation) => {
          const orderRef = donation.order_reference
          if (!acc[orderRef]) {
            acc[orderRef] = []
          }
          acc[orderRef].push(donation)
          return acc
        }, {} as Record<string, typeof donations>)

        const orders = Object.entries(orderGroups)

        return (
          <div className="space-y-6">
            {/* Results Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-display">
                {t('results.title', { count: orders.length })}
              </h2>
            </div>

            {/* Order Cards */}
            <div className="grid gap-4">
              {orders.map(([orderReference, orderDonations]) => {
                const firstDonation = orderDonations[0]

                // Sum all donations in this order regardless of status
                const displayAmount = orderDonations.reduce((sum, d) => sum + Number(d.amount), 0)

                // Only count paid/confirmed/delivering for refundable amount (exclude completed)
                const refundableAmount = orderDonations
                  .filter(d => canRequestRefund(d.donation_status))
                  .reduce((sum, d) => sum + Number(d.amount), 0)

                // Get unique projects in this order
                const projectCount = new Set(orderDonations.map(d => d.projects.id)).size

                // Get unit name for display (from first donation's project)
                const unitName = getUnitName(
                  firstDonation.projects.unit_name_i18n,
                  firstDonation.projects.unit_name,
                  locale as SupportedLocale
                )

                // Check if any donation in this order belongs to an aggregate project
                const hasAggregateProject = orderDonations.some(d => d.projects.aggregate_donations === true)

                // Check if order is currently being refunded
                const isRefunding = orderDonations.some(d =>
                  isRefundPending(d.donation_status)
                )

                return (
                  <div
                    key={orderReference}
                    className="bg-white rounded-xl border border-gray-200 hover:border-ukraine-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 font-display">
                            {t('results.orderTitle')} #{orderReference.slice(-8)}
                          </h3>
                          {projectCount > 1 && (
                            <p className="text-sm text-gray-600 mt-1">
                              {t('results.multipleProjects', { count: projectCount })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Order Details Grid */}
                      <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasAggregateProject ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4 mb-4`}>
                        {/* Order Reference */}
                        <div>
                          <div className="text-xs text-gray-500 font-medium mb-1">{t('results.orderReference')}</div>
                          <code className="text-xs font-data bg-gray-100 px-2 py-1 rounded inline-block text-gray-800">
                            {orderReference}
                          </code>
                        </div>

                        {/* Quantity - hide for aggregate projects */}
                        {!hasAggregateProject && (
                          <div>
                            <div className="text-xs text-gray-500 font-medium mb-1">{t('results.quantity')}</div>
                            <div className="text-lg font-bold text-gray-900">
                              {orderDonations.length} {unitName}
                            </div>
                          </div>
                        )}

                        {/* Total Amount */}
                        <div>
                          <div className="text-xs text-gray-500 font-medium mb-1">{t('results.totalAmount')}</div>
                          <div className="text-lg font-bold text-gray-900">
                            {firstDonation.currency} {displayAmount.toFixed(2)}
                          </div>
                        </div>

                        {/* Date */}
                        <div>
                          <div className="text-xs text-gray-500 font-medium mb-1">{t('results.date')}</div>
                          <div className="text-sm text-gray-700 font-medium">
                            {formatDate(firstDonation.donated_at, locale as SupportedLocale, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Individual Donations List */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 font-medium mb-3">{t('results.donations')}</div>
                        <div className="space-y-2">
                          {orderDonations.map((donation) => {
                            // Get translated project name for this donation
                            const donationProjectName = getProjectName(
                              donation.projects.project_name_i18n,
                              donation.projects.project_name,
                              locale as SupportedLocale
                            )

                            return (
                              <div
                                key={donation.id}
                                className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                              >
                                {/* Top Row: Donation ID + Status */}
                                <div className="flex items-center justify-between gap-2">
                                  <code className="text-xs font-data bg-ukraine-blue-50 text-ukraine-blue-900 px-2 py-1 rounded border border-ukraine-blue-200">
                                    {donation.donation_public_id}
                                  </code>
                                  <DonationStatusBadge status={donation.donation_status} />
                                </div>

                                {/* Middle Row: Project Name (clickable) */}
                                <div>
                                  <Link
                                    href={`/donate?project=${donation.projects.id}`}
                                    className="text-sm font-semibold text-gray-900 hover:text-ukraine-blue-500 transition-colors inline-flex items-center gap-1 group"
                                  >
                                    {donationProjectName}
                                    <ExternalLinkIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Link>
                                </div>

                                {/* Bottom Row: Amount + Dates */}
                                <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                                  <span className="font-semibold text-gray-900">
                                    {donation.currency} {Number(donation.amount).toFixed(2)}
                                  </span>
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span>
                                      {formatDate(donation.donated_at, locale as SupportedLocale, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                      })}
                                    </span>
                                    {donation.updated_at && donation.updated_at !== donation.donated_at && (
                                      <span className="text-gray-500">
                                        {t('results.updatedAt')}: {formatDate(donation.updated_at, locale as SupportedLocale, {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* View Result Button - shown only if this donation is completed */}
                                {canViewResult(donation.donation_status) && (
                                  <button
                                    className="flex items-center justify-center gap-2 px-3 py-2 mt-2 bg-ukraine-blue-500 text-white rounded-lg hover:bg-ukraine-blue-700 transition-colors font-medium text-xs"
                                    onClick={() => setViewResultDonationId(donation.donation_public_id)}
                                  >
                                    <CheckCircle2Icon className="w-3.5 h-3.5" />
                                    {t('actions.viewResult')}
                                    <ArrowRightIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Action Buttons - Order Level */}
                      {refundableAmount > 0 && (
                        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                          {/* Refund button - show only if there are refundable donations (paid/confirmed/delivering) */}
                          <button
                            className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => setConfirmRefundId(orderReference)}
                            disabled={isRefunding}
                          >
                            {isRefunding ? (
                              <>
                                <div className="w-4 h-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin"></div>
                                {t('form.processing')}
                              </>
                            ) : (
                              <>
                                {t('actions.requestRefund')}
                                <ArrowRightIcon className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* No Results */}
      {donations && donations.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <SearchIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">No Donations Found</h3>
          <p className="text-gray-600">{t('errors.donationNotFound')}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmRefundId && (() => {
        // Get donations for this order
        const orderDonations = donations?.filter(d => d.order_reference === confirmRefundId) || []
        // Filter refundable donations (paid/confirmed/delivering)
        const refundableDonations = orderDonations.filter(d =>
          canRequestRefund(d.donation_status)
        )
        // Calculate total refundable amount
        const totalRefundAmount = refundableDonations.reduce((sum, d) => sum + Number(d.amount), 0)
        const currency = refundableDonations[0]?.currency || 'UAH'

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangleIcon className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-display">
                    {t('refundDialog.title')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {t('refundDialog.description')}
                  </p>
                </div>
              </div>

              {/* Refundable Records */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 font-medium mb-2">{t('refundDialog.refundableRecords')}</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {refundableDonations.map((donation) => {
                    const donationProjectName = getProjectName(
                      donation.projects.project_name_i18n,
                      donation.projects.project_name,
                      locale as SupportedLocale
                    )
                    return (
                      <div key={donation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                        <div className="flex-1 min-w-0">
                          <code className="text-xs font-data bg-orange-50 text-orange-800 px-1.5 py-0.5 rounded">
                            {donation.donation_public_id}
                          </code>
                          <div className="text-xs text-gray-500 truncate mt-0.5">{donationProjectName}</div>
                        </div>
                        <div className="font-semibold text-gray-900 ml-2">
                          {donation.currency} {Number(donation.amount).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Non-refundable notice */}
              {orderDonations.length > refundableDonations.length && (
                <div className="mb-4 p-2 bg-gray-100 rounded-lg">
                  <p className="text-xs text-gray-600">
                    {t('refundDialog.nonRefundableNotice', {
                      count: orderDonations.length - refundableDonations.length
                    })}
                  </p>
                </div>
              )}

              {/* Total Refund Amount */}
              <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('refundDialog.totalRefundAmount')}</span>
                  <span className="text-lg font-bold text-orange-700">
                    {currency} {totalRefundAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRefundId(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  {t('refundDialog.cancel')}
                </button>
                <button
                  onClick={() => handleRequestRefund(confirmRefundId)}
                  className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                >
                  {t('refundDialog.confirm')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Result Viewer Modal */}
      {viewResultDonationId && (
        <DonationResultViewer
          donationPublicId={viewResultDonationId}
          onClose={() => setViewResultDonationId(null)}
        />
      )}
    </div>
  )
}
