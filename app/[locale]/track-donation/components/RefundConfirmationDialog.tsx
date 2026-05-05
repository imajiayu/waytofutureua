'use client'

import { useTranslations } from 'next-intl'

import { AlertTriangleIcon } from '@/components/icons'
import { canRequestRefund } from '@/lib/donation-status'
import { getTranslatedText } from '@/lib/i18n-utils'
import type { AppLocale } from '@/types'

import type { TrackDonation } from './types'

interface Props {
  orderReference: string
  donations: TrackDonation[]
  locale: string
  onConfirm: (orderReference: string) => void
  onCancel: () => void
}

export default function RefundConfirmationDialog({
  orderReference,
  donations,
  locale,
  onConfirm,
  onCancel,
}: Props) {
  const t = useTranslations('trackDonation')

  const orderDonations = donations.filter((d) => d.order_reference === orderReference)
  const refundableDonations = orderDonations.filter((d) => canRequestRefund(d.donation_status))
  const totalRefundAmount = refundableDonations.reduce((sum, d) => sum + Number(d.amount), 0)
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
              const donationProjectName = getTranslatedText(
                donation.projects.project_name_i18n,
                locale as AppLocale
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
            onClick={onCancel}
            className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            {t('refundDialog.cancel')}
          </button>
          <button
            onClick={() => onConfirm(orderReference)}
            className="flex-1 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700"
          >
            {t('refundDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
