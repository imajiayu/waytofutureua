'use client'

import DonationStatusProgress from '@/components/admin/DonationStatusProgress'
import AdminButton from '@/components/admin/ui/AdminButton'
import { type DonationStatus, isRefundStatus } from '@/lib/donation-status'

interface Props {
  currentStatus: DonationStatus
  newStatus: string
  setNewStatus: (status: string) => void
  canUpdate: boolean
  canManageFiles: boolean
  loading: boolean
  uploading: boolean
  onClose: () => void
}

export default function DonationStatusSection({
  currentStatus,
  newStatus,
  setNewStatus,
  canUpdate,
  canManageFiles,
  loading,
  uploading,
  onClose,
}: Props) {
  return (
    <div className="mb-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Donation Status Flow</h3>
        <DonationStatusProgress
          currentStatus={currentStatus}
          selectedStatus={canUpdate ? newStatus : undefined}
          onStatusSelect={canUpdate ? setNewStatus : undefined}
        />

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
                disabled={loading || uploading || !newStatus}
                className="transition-colors disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Update Status'}
              </AdminButton>
            </div>
          </div>
        )}

        {!canUpdate && !canManageFiles && (
          <div className="mt-4 border-t border-gray-300 pt-4">
            <div className="mb-3 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              This donation cannot be updated. Current status: <strong>{currentStatus}</strong>
              {isRefundStatus(currentStatus) && (
                <div className="mt-2 text-xs">
                  ℹ️ Refund statuses are managed automatically by WayForPay and cannot be modified
                  manually.
                </div>
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
