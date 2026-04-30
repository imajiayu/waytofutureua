'use client'

import { useTranslations } from 'next-intl'

import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import { ArrowRightIcon, CheckCircle2Icon, ExternalLinkIcon } from '@/components/icons'
import { Link } from '@/i18n/navigation'
import { canRequestRefund, canViewResult, isRefundPending } from '@/lib/donation-status'
import { formatDate, getProjectName, getUnitName } from '@/lib/i18n-utils'
import type { AppLocale } from '@/types'

import type { TrackDonation } from './types'

interface Props {
  orderReference: string
  orderDonations: TrackDonation[]
  locale: string
  onRequestRefund: (orderReference: string) => void
  onViewResult: (donationPublicId: string) => void
}

export default function OrderGroupCard({
  orderReference,
  orderDonations,
  locale,
  onRequestRefund,
  onViewResult,
}: Props) {
  const t = useTranslations('trackDonation')

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
    locale as AppLocale
  )

  // Check if any donation in this order belongs to an aggregate project
  const hasAggregateProject = orderDonations.some((d) => d.projects.aggregate_donations === true)

  // Check if order is currently being refunded
  const isRefunding = orderDonations.some((d) => isRefundPending(d.donation_status))

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-ukraine-blue-300 hover:shadow-lg">
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
              <div className="mb-1 text-xs font-medium text-gray-500">{t('results.quantity')}</div>
              <div className="text-lg font-bold text-gray-900">
                {orderDonations.length} {unitName}
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">{t('results.totalAmount')}</div>
            <div className="text-lg font-bold text-gray-900">
              {firstDonation.currency} {displayAmount.toFixed(2)}
            </div>
          </div>

          {/* Date */}
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">{t('results.date')}</div>
            <div className="text-sm font-medium text-gray-700">
              {formatDate(firstDonation.donated_at, locale as AppLocale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Individual Donations List */}
        <div className="mb-4">
          <div className="mb-3 text-xs font-medium text-gray-500">{t('results.donations')}</div>
          <div className="space-y-2">
            {orderDonations.map((donation) => {
              const donationProjectName = getProjectName(
                donation.projects.project_name_i18n,
                donation.projects.project_name,
                locale as AppLocale
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
                        {formatDate(donation.donated_at, locale as AppLocale, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {donation.updated_at && donation.updated_at !== donation.donated_at && (
                        <span className="text-gray-500">
                          {t('results.updatedAt')}:{' '}
                          {formatDate(donation.updated_at, locale as AppLocale, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View Result Button - shown only if this donation is completed */}
                  {canViewResult(donation.donation_status) && (
                    <button
                      className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-ukraine-blue-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-ukraine-blue-700"
                      onClick={() => onViewResult(donation.donation_public_id)}
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
            <button
              className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onRequestRefund(orderReference)}
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
}
