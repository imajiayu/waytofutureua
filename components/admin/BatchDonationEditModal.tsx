'use client'

import { useState } from 'react'

import { batchUpdateDonationStatus } from '@/app/actions/admin'
import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import { type DonationStatus, getNextAllowedStatuses } from '@/lib/donation-status'
import { useAsyncForm } from '@/lib/hooks/useAsyncForm'
import type { Database } from '@/types/database'

import AdminBaseModal from './AdminBaseModal'
import DonationStatusProgress from './DonationStatusProgress'
import AdminButton from './ui/AdminButton'

type Donation = Database['public']['Tables']['donations']['Row']

interface Props {
  donations: Donation[]
  onClose: () => void
  onSaved: (donations: Donation[]) => void
}

export default function BatchDonationEditModal({ donations, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState<string>('')

  const currentStatus = (donations[0]?.donation_status || '') as DonationStatus
  const allowedStatuses = getNextAllowedStatuses(currentStatus)
  const canUpdate = allowedStatuses.length > 0

  const {
    loading,
    error,
    onSubmit: handleSubmit,
  } = useAsyncForm(
    async () => {
      const donationIds = donations.map((d) => d.id)
      const updated = await batchUpdateDonationStatus(donationIds, newStatus)
      onSaved(updated)
    },
    { fallbackError: 'Failed to update donations' }
  )

  if (donations.length === 0) {
    return null
  }

  return (
    <AdminBaseModal
      title={`Batch Edit Donations (${donations.length} selected)`}
      onClose={onClose}
      error={error}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit}>
        {/* Status Progress Visualization */}
        <div className="mb-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">
              Donation Status Flow
            </h3>
            <DonationStatusProgress
              currentStatus={currentStatus}
              selectedStatus={canUpdate ? newStatus : undefined}
              onStatusSelect={canUpdate ? setNewStatus : undefined}
            />

            {/* Info Banner */}
            <div className="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
              <div className="mb-1 font-semibold">Batch Update Info:</div>
              <ul className="list-inside list-disc space-y-1 text-xs">
                <li>
                  All {donations.length} selected donations have status:{' '}
                  <strong>{currentStatus}</strong>
                </li>
                <li>They will all be updated to the same new status</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>

            {/* Action Buttons */}
            {canUpdate && (
              <div className="mt-4 border-t border-gray-300 pt-4">
                {!newStatus && (
                  <div className="mb-3 rounded bg-blue-50 p-3 text-sm text-blue-700">
                    👆 Click the next status in the progress bar above to continue
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <AdminButton
                    variant="secondary"
                    onClick={onClose}
                    disabled={loading}
                    className="transition-colors"
                  >
                    Cancel
                  </AdminButton>
                  <AdminButton
                    type="submit"
                    variant="primary"
                    disabled={loading || !newStatus}
                    className="transition-colors disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : `Update ${donations.length} Donations`}
                  </AdminButton>
                </div>
              </div>
            )}

            {!canUpdate && (
              <div className="mt-4 border-t border-gray-300 pt-4">
                <div className="mb-3 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                  These donations cannot be updated. Current status:{' '}
                  <strong>{currentStatus}</strong>
                </div>
                <div className="flex justify-end">
                  <AdminButton variant="secondary" onClick={onClose} className="transition-colors">
                    Close
                  </AdminButton>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Donations List */}
        <div className="mb-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">
              Selected Donations
            </h3>
            <div className="max-h-64 overflow-x-auto overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      ID
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Donor
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {donations.map((donation) => (
                    <tr key={donation.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900">
                        <div className="text-xs font-medium">#{donation.id}</div>
                        <div className="text-xs text-gray-500">{donation.donation_public_id}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{donation.donor_name}</div>
                        <div className="max-w-[150px] truncate text-xs text-gray-500">
                          {donation.donor_email}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                        {donation.amount} {donation.currency || 'UAH'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <DonationStatusBadge status={donation.donation_status as DonationStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </form>
    </AdminBaseModal>
  )
}
