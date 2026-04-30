'use client'

import type { MarketOrderStatus } from '@/types/market'

interface Props {
  nextStatuses: MarketOrderStatus[]
  newStatus: MarketOrderStatus | ''
  onSelectStatus: (status: MarketOrderStatus) => void
  showTrackingInput: boolean
  trackingNumber: string
  setTrackingNumber: (v: string) => void
  trackingCarrier: string
  setTrackingCarrier: (v: string) => void
  loading: boolean
  uploading: boolean
  onClose: () => void
}

export default function MarketOrderStatusSection({
  nextStatuses,
  newStatus,
  onSelectStatus,
  showTrackingInput,
  trackingNumber,
  setTrackingNumber,
  trackingCarrier,
  setTrackingCarrier,
  loading,
  uploading,
  onClose,
}: Props) {
  return (
    <div className="mb-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Update Status</h3>

        <div className="mb-4 flex gap-2">
          {nextStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onSelectStatus(status)}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                newStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              → {status}
            </button>
          ))}
        </div>

        {showTrackingInput && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tracking Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. UA123456789"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Carrier (optional)
              </label>
              <input
                type="text"
                value={trackingCarrier}
                onChange={(e) => setTrackingCarrier(e.target.value)}
                placeholder="e.g. Nova Poshta"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 border-t border-gray-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading || !newStatus}
            className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  )
}
