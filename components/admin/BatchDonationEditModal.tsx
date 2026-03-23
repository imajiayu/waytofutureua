'use client'

import { useState } from 'react'
import type { Database } from '@/types/database'
import { batchUpdateDonationStatus } from '@/app/actions/admin'
import AdminBaseModal from './AdminBaseModal'
import DonationStatusProgress from './DonationStatusProgress'
import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import { getNextAllowedStatuses, type DonationStatus } from '@/lib/donation-status'

type Donation = Database['public']['Tables']['donations']['Row']

interface Props {
  donations: Donation[]
  onClose: () => void
  onSaved: (donations: Donation[]) => void
}

export default function BatchDonationEditModal({ donations, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (donations.length === 0) {
    return null
  }

  const currentStatus = (donations[0].donation_status || '') as DonationStatus
  const allowedStatuses = getNextAllowedStatuses(currentStatus)
  const canUpdate = allowedStatuses.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const donationIds = donations.map(d => d.id)
      const updated = await batchUpdateDonationStatus(donationIds, newStatus)
      onSaved(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update donations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminBaseModal title={`Batch Edit Donations (${donations.length} selected)`} onClose={onClose} error={error} maxWidth="3xl">
      <form onSubmit={handleSubmit}>

          {/* Status Progress Visualization */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Donation Status Flow</h3>
              <DonationStatusProgress
                currentStatus={currentStatus}
                selectedStatus={canUpdate ? newStatus : undefined}
                onStatusSelect={canUpdate ? setNewStatus : undefined}
              />

              {/* Info Banner */}
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded text-sm">
                <div className="font-semibold mb-1">Batch Update Info:</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All {donations.length} selected donations have status: <strong>{currentStatus}</strong></li>
                  <li>They will all be updated to the same new status</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>

              {/* Action Buttons */}
              {canUpdate && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  {!newStatus && (
                    <div className="mb-3 p-3 bg-blue-50 text-blue-700 rounded text-sm">
                      👆 Click the next status in the progress bar above to continue
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !newStatus}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {loading
                        ? 'Updating...'
                        : `Update ${donations.length} Donations`}
                    </button>
                  </div>
                </div>
              )}

              {!canUpdate && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="mb-3 p-3 bg-yellow-50 text-yellow-800 rounded text-sm">
                    These donations cannot be updated. Current status: <strong>{currentStatus}</strong>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Donations List */}
          <div className="mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Selected Donations</h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Donor
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {donations.map((donation) => (
                      <tr key={donation.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">
                          <div className="font-medium text-xs">#{donation.id}</div>
                          <div className="text-xs text-gray-500">{donation.donation_public_id}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{donation.donor_name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[150px]">
                            {donation.donor_email}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-900">
                          {donation.amount} {donation.currency || 'UAH'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
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
