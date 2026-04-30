'use client'

import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import { type DonationStatus } from '@/lib/donation-status'
import { formatDateTime } from '@/lib/i18n-utils'
import type { Database } from '@/types/database'

type Donation = Database['public']['Tables']['donations']['Row']

interface Props {
  donation: Donation
}

/** Read-only display of donation basic / donor / payment / timestamp info. */
export default function DonationInfoPanel({ donation }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Basic Information</h3>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium text-gray-600">ID:</span>
            <span className="ml-2 text-gray-900">{donation.id}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Public ID:</span>
            <span className="ml-2 text-gray-900">{donation.donation_public_id}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Project ID:</span>
            <span className="ml-2 text-gray-900">{donation.project_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-600">Status:</span>
            <DonationStatusBadge status={(donation.donation_status || '') as DonationStatus} />
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 p-4">
        <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Donor Information</h3>
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-600">Name:</span>
            <span className="ml-2 text-gray-900">{donation.donor_name}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Email:</span>
            <span className="ml-2 text-gray-900">{donation.donor_email}</span>
          </div>
          {donation.contact_telegram && (
            <div>
              <span className="font-medium text-gray-600">Telegram:</span>
              <span className="ml-2 text-gray-900">{donation.contact_telegram}</span>
            </div>
          )}
          {donation.contact_whatsapp && (
            <div>
              <span className="font-medium text-gray-600">WhatsApp:</span>
              <span className="ml-2 text-gray-900">{donation.contact_whatsapp}</span>
            </div>
          )}
          {donation.donor_message && (
            <div>
              <span className="font-medium text-gray-600">Message:</span>
              <div className="mt-1 rounded border border-gray-200 bg-white p-2 text-gray-900">
                {donation.donor_message}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-green-50 p-4">
        <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Payment Information</h3>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium text-gray-600">Amount:</span>
            <span className="ml-2 text-gray-900">
              {donation.amount} {donation.currency || 'UAH'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Payment Method:</span>
            <span className="ml-2 text-gray-900">{donation.payment_method || 'N/A'}</span>
          </div>
          <div className="sm:col-span-2">
            <span className="font-medium text-gray-600">Order Reference:</span>
            <span className="ml-2 font-data text-xs text-gray-900">{donation.order_reference}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-purple-50 p-4">
        <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Timestamps</h3>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium text-gray-600">Donated At:</span>
            <div className="text-xs text-gray-900">{formatDateTime(donation.donated_at)}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Created At:</span>
            <div className="text-xs text-gray-900">{formatDateTime(donation.created_at)}</div>
          </div>
          <div>
            <span className="font-medium text-gray-600">Locale:</span>
            <span className="ml-2 text-gray-900">{donation.locale || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
