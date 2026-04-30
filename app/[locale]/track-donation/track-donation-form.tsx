'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { requestRefund, trackDonations } from '@/app/actions/track-donation'
import DonationResultViewer from '@/components/donation-display/DonationResultViewer'
import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  HashIcon,
  MailIcon,
  SearchIcon,
} from '@/components/icons'
import { Link } from '@/i18n/navigation'
import {
  canRequestRefund,
  canViewResult,
  type DonationStatus,
  isRefundPending,
} from '@/lib/donation-status'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import { formatDate, getProjectName, getUnitName, type SupportedLocale } from '@/lib/i18n-utils'
import { clientLogger } from '@/lib/logger-client'
import type { I18nText } from '@/types'

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

  // 自动查询函数
  const handleAutoQuery = useCallback(
    async (queryEmail: string, queryId: string) => {
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
    },
    [t]
  )

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
  }, [searchParams, donations, handleAutoQuery])

  // Lock body scroll when confirmation dialog is open
  useBodyScrollLock(!!confirmRefundId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    const trimmedId = donationId.trim()

    if (!trimmedEmail) {
      setError(t('errors.emailRequired'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t('errors.emailInvalid'))
      return
    }
    if (!trimmedId) {
      setError(t('errors.donationIdRequired'))
      return
    }

    setDonations(null)
    setLoading(true)

    try {
      const result = await trackDonations({ email: trimmedEmail, donationId: trimmedId })
      if (result.error) {
        setError(t(`errors.${result.error}`))
      } else if (result.donations) {
        setDonations(result.donations as Donation[])
        // 查询成功后更新 URL，这样切换语言时能保留查询参数
        const url = new URL(window.location.href)
        url.searchParams.set('email', trimmedEmail)
        url.searchParams.set('id', trimmedId)
        window.history.replaceState({}, '', url.toString())
        // 同时更新 lastAutoQueryParams，防止 useEffect 重复查询
        lastAutoQueryParams.current = { email: trimmedEmail, id: trimmedId }
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
    const refundableDonation = donations?.find(
      (d) => d.order_reference === orderReference && canRequestRefund(d.donation_status)
    )
    if (!refundableDonation) {
      setError(t('errors.cannotRefundCompleted'))
      return
    }

    // 立即关闭确认窗口
    setConfirmRefundId(null)
    setError('')

    // 立即更新UI为"refunding"状态（乐观更新）- 只更新可退款的记录
    setDonations((prev) =>
      prev
        ? prev.map((d) =>
            d.order_reference === orderReference && canRequestRefund(d.donation_status)
              ? { ...d, donation_status: 'refunding' as DonationStatus }
              : d
          )
        : null
    )

    // 异步发送退款请求（不阻塞UI）
    requestRefund({
      donationPublicId: refundableDonation.donation_public_id,
      email,
    })
      .then((result) => {
        if (result.error) {
          // 退款失败，显示错误并恢复原状态
          setError(t(`errors.${result.error}`))
          // 重新查询获取正确的状态
          trackDonations({ email, donationId: refundableDonation.donation_public_id }).then(
            (trackResult) => {
              if (trackResult.donations) {
                setDonations(trackResult.donations)
              }
            }
          )
        } else if (result.success) {
          // 退款成功，只更新可退款的记录为实际状态
          const newStatus = (result as any).status || 'refund_processing'
          setDonations((prev) =>
            prev
              ? prev.map((d) =>
                  d.order_reference === orderReference &&
                  (canRequestRefund(d.donation_status) || d.donation_status === 'refunding')
                    ? { ...d, donation_status: newStatus as DonationStatus }
                    : d
                )
              : null
          )
        }
      })
      .catch((err) => {
        clientLogger.error('API', 'Refund request failed', {
          error: err instanceof Error ? err.message : String(err),
        })
        setError(t('errors.serverError'))
        // 重新查询获取正确的状态
        trackDonations({ email, donationId: refundableDonation.donation_public_id }).then(
          (trackResult) => {
            if (trackResult.donations) {
              setDonations(trackResult.donations)
            }
          }
        )
      })
  }

  return (
    <div className="pb-20">
      {/* Search Form Card */}
      <div className="mb-12 rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <MailIcon className="h-4 w-4 text-ukraine-blue-500" />
                  {t('form.email')}
                </div>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
                placeholder={t('form.emailPlaceholder')}
              />
            </div>

            {/* Donation ID Input */}
            <div>
              <label
                htmlFor="donationId"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <HashIcon className="h-4 w-4 text-ukraine-blue-500" />
                  {t('form.donationId')}
                </div>
              </label>
              <input
                id="donationId"
                type="text"
                value={donationId}
                onChange={(e) => {
                  setDonationId(e.target.value)
                  if (error) setError('')
                }}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
                placeholder={t('form.donationIdPlaceholder')}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative flex w-full transform items-center justify-center gap-2 overflow-hidden rounded-xl bg-ukraine-gold-500 py-4 font-semibold text-ukraine-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-ukraine-gold-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
            {loading ? (
              <>
                <div className="relative z-10 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span className="relative z-10">{t('form.searching')}</span>
              </>
            ) : (
              <>
                <SearchIcon className="relative z-10 h-5 w-5" />
                <span className="relative z-10">{t('form.submit')}</span>
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-6 rounded-lg border-l-4 border-warm-500 bg-warm-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-warm-500" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="ml-3 text-sm font-medium text-warm-700">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {donations &&
        donations.length > 0 &&
        (() => {
          // Group donations by order_reference
          const orderGroups = donations.reduce(
            (acc, donation) => {
              const orderRef = donation.order_reference
              if (!acc[orderRef]) {
                acc[orderRef] = []
              }
              acc[orderRef].push(donation)
              return acc
            },
            {} as Record<string, typeof donations>
          )

          const orders = Object.entries(orderGroups)

          return (
            <div className="space-y-6">
              {/* Results Header */}
              <div>
                <h2 className="font-display text-2xl font-bold text-gray-900">
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
                    .filter((d) => canRequestRefund(d.donation_status))
                    .reduce((sum, d) => sum + Number(d.amount), 0)

                  // Get unique projects in this order
                  const projectCount = new Set(orderDonations.map((d) => d.projects.id)).size

                  // Get unit name for display (from first donation's project)
                  const unitName = getUnitName(
                    firstDonation.projects.unit_name_i18n,
                    firstDonation.projects.unit_name,
                    locale as SupportedLocale
                  )

                  // Check if any donation in this order belongs to an aggregate project
                  const hasAggregateProject = orderDonations.some(
                    (d) => d.projects.aggregate_donations === true
                  )

                  // Check if order is currently being refunded
                  const isRefunding = orderDonations.some((d) => isRefundPending(d.donation_status))

                  return (
                    <div
                      key={orderReference}
                      className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-ukraine-blue-300 hover:shadow-lg"
                    >
                      <div className="p-6">
                        {/* Header Row */}
                        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1">
                            <h3 className="font-display text-lg font-bold text-gray-900">
                              {t('results.orderTitle')} #{orderReference.slice(-8)}
                            </h3>
                            {projectCount > 1 && (
                              <p className="mt-1 text-sm text-gray-600">
                                {t('results.multipleProjects', { count: projectCount })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Order Details Grid */}
                        <div
                          className={`grid grid-cols-1 sm:grid-cols-2 ${hasAggregateProject ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} mb-4 gap-4`}
                        >
                          {/* Order Reference */}
                          <div>
                            <div className="mb-1 text-xs font-medium text-gray-500">
                              {t('results.orderReference')}
                            </div>
                            <code className="inline-block rounded bg-gray-100 px-2 py-1 font-data text-xs text-gray-800">
                              {orderReference}
                            </code>
                          </div>

                          {/* Quantity - hide for aggregate projects */}
                          {!hasAggregateProject && (
                            <div>
                              <div className="mb-1 text-xs font-medium text-gray-500">
                                {t('results.quantity')}
                              </div>
                              <div className="text-lg font-bold text-gray-900">
                                {orderDonations.length} {unitName}
                              </div>
                            </div>
                          )}

                          {/* Total Amount */}
                          <div>
                            <div className="mb-1 text-xs font-medium text-gray-500">
                              {t('results.totalAmount')}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {firstDonation.currency} {displayAmount.toFixed(2)}
                            </div>
                          </div>

                          {/* Date */}
                          <div>
                            <div className="mb-1 text-xs font-medium text-gray-500">
                              {t('results.date')}
                            </div>
                            <div className="text-sm font-medium text-gray-700">
                              {formatDate(firstDonation.donated_at, locale as SupportedLocale, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Individual Donations List */}
                        <div className="mb-4">
                          <div className="mb-3 text-xs font-medium text-gray-500">
                            {t('results.donations')}
                          </div>
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
                                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
                                >
                                  {/* Top Row: Donation ID + Status */}
                                  <div className="flex items-center justify-between gap-2">
                                    <code className="rounded border border-ukraine-blue-200 bg-ukraine-blue-50 px-2 py-1 font-data text-xs text-ukraine-blue-900">
                                      {donation.donation_public_id}
                                    </code>
                                    <DonationStatusBadge status={donation.donation_status} />
                                  </div>

                                  {/* Middle Row: Project Name (clickable) */}
                                  <div>
                                    <Link
                                      href={`/donate?project=${donation.projects.id}`}
                                      className="group inline-flex items-center gap-1 text-sm font-semibold text-gray-900 transition-colors hover:text-ukraine-blue-500"
                                    >
                                      {donationProjectName}
                                      <ExternalLinkIcon className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </Link>
                                  </div>

                                  {/* Bottom Row: Amount + Dates */}
                                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                                    <span className="font-semibold text-gray-900">
                                      {donation.currency} {Number(donation.amount).toFixed(2)}
                                    </span>
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span>
                                        {formatDate(
                                          donation.donated_at,
                                          locale as SupportedLocale,
                                          {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                          }
                                        )}
                                      </span>
                                      {donation.updated_at &&
                                        donation.updated_at !== donation.donated_at && (
                                          <span className="text-gray-500">
                                            {t('results.updatedAt')}:{' '}
                                            {formatDate(
                                              donation.updated_at,
                                              locale as SupportedLocale,
                                              {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              }
                                            )}
                                          </span>
                                        )}
                                    </div>
                                  </div>

                                  {/* View Result Button - shown only if this donation is completed */}
                                  {canViewResult(donation.donation_status) && (
                                    <button
                                      className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-ukraine-blue-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-ukraine-blue-700"
                                      onClick={() =>
                                        setViewResultDonationId(donation.donation_public_id)
                                      }
                                    >
                                      <CheckCircle2Icon className="h-3.5 w-3.5" />
                                      {t('actions.viewResult')}
                                      <ArrowRightIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Action Buttons - Order Level */}
                        {refundableAmount > 0 && (
                          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
                            {/* Refund button - show only if there are refundable donations (paid/confirmed/delivering) */}
                            <button
                              className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => setConfirmRefundId(orderReference)}
                              disabled={isRefunding}
                            >
                              {isRefunding ? (
                                <>
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-700 border-t-transparent"></div>
                                  {t('form.processing')}
                                </>
                              ) : (
                                <>
                                  {t('actions.requestRefund')}
                                  <ArrowRightIcon className="h-4 w-4" />
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
        <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <SearchIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 font-display text-lg font-semibold text-gray-900">
            {t('noDonationsFound')}
          </h3>
          <p className="text-gray-600">{t('errors.donationNotFound')}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmRefundId &&
        (() => {
          // Get donations for this order
          const orderDonations =
            donations?.filter((d) => d.order_reference === confirmRefundId) || []
          // Filter refundable donations (paid/confirmed/delivering)
          const refundableDonations = orderDonations.filter((d) =>
            canRequestRefund(d.donation_status)
          )
          // Calculate total refundable amount
          const totalRefundAmount = refundableDonations.reduce(
            (sum, d) => sum + Number(d.amount),
            0
          )
          const currency = refundableDonations[0]?.currency || 'UAH'

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="refund-dialog-title"
            >
              <div className="animate-in fade-in zoom-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl duration-200">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <AlertTriangleIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3
                      id="refund-dialog-title"
                      className="mb-2 font-display text-lg font-bold text-gray-900"
                    >
                      {t('refundDialog.title')}
                    </h3>
                    <p className="mb-1 text-sm text-gray-600">{t('refundDialog.description')}</p>
                  </div>
                </div>

                {/* Refundable Records */}
                <div className="mb-4">
                  <div className="mb-2 text-xs font-medium text-gray-500">
                    {t('refundDialog.refundableRecords')}
                  </div>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {refundableDonations.map((donation) => {
                      const donationProjectName = getProjectName(
                        donation.projects.project_name_i18n,
                        donation.projects.project_name,
                        locale as SupportedLocale
                      )
                      return (
                        <div
                          key={donation.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <code className="rounded bg-orange-50 px-1.5 py-0.5 font-data text-xs text-orange-800">
                              {donation.donation_public_id}
                            </code>
                            <div className="mt-0.5 truncate text-xs text-gray-500">
                              {donationProjectName}
                            </div>
                          </div>
                          <div className="ml-2 font-semibold text-gray-900">
                            {donation.currency} {Number(donation.amount).toFixed(2)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Non-refundable notice */}
                {orderDonations.length > refundableDonations.length && (
                  <div className="mb-4 rounded-lg bg-gray-100 p-2">
                    <p className="text-xs text-gray-600">
                      {t('refundDialog.nonRefundableNotice', {
                        count: orderDonations.length - refundableDonations.length,
                      })}
                    </p>
                  </div>
                )}

                {/* Total Refund Amount */}
                <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {t('refundDialog.totalRefundAmount')}
                    </span>
                    <span className="text-lg font-bold text-orange-700">
                      {currency} {totalRefundAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmRefundId(null)}
                    className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                  >
                    {t('refundDialog.cancel')}
                  </button>
                  <button
                    onClick={() => handleRequestRefund(confirmRefundId)}
                    className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
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
