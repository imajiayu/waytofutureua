'use client'

import {
  DISPLAY_FLOW_STATUSES,
  getNextAllowedStatuses,
  isRefundStatus,
  isRefundPending,
  type DonationStatus
} from '@/lib/donation-status'

interface DonationStatusProgressProps {
  currentStatus: string
  onStatusSelect?: (status: string) => void
  selectedStatus?: string
}

const NORMAL_FLOW_STATUSES = DISPLAY_FLOW_STATUSES.map(status => ({
  key: status,
  label: status.charAt(0).toUpperCase() + status.slice(1),
}))

export default function DonationStatusProgress({
  currentStatus,
  onStatusSelect,
  selectedStatus,
}: DonationStatusProgressProps) {
  const currentIndex = NORMAL_FLOW_STATUSES.findIndex((s) => s.key === currentStatus)
  const allowedNextStatuses = getNextAllowedStatuses(currentStatus as DonationStatus)

  const getStatusState = (status: string, index: number): 'completed' | 'current' | 'next' | 'future' => {
    if (index < currentIndex) return 'completed'
    if (status === currentStatus) return 'current'
    if (allowedNextStatuses.includes(status as DonationStatus)) return 'next'
    return 'future'
  }

  const getStatusStyles = (state: 'completed' | 'current' | 'next' | 'future', isSelected: boolean) => {
    if (state === 'completed') {
      return {
        circle: 'bg-green-500 text-white border-green-500',
        label: 'text-green-700',
        line: 'bg-green-500',
      }
    }
    if (state === 'current') {
      return {
        circle: isSelected
          ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-200'
          : 'bg-blue-600 text-white border-blue-600',
        label: 'text-blue-700 font-semibold',
        line: 'bg-gray-300',
      }
    }
    if (state === 'next') {
      return {
        circle: isSelected
          ? 'bg-blue-100 text-blue-700 border-blue-500 ring-4 ring-blue-200 cursor-pointer hover:bg-blue-200'
          : 'bg-white text-blue-600 border-blue-500 cursor-pointer hover:bg-blue-50',
        label: 'text-blue-600 font-medium',
        line: 'bg-gray-300',
      }
    }
    // future
    return {
      circle: 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed',
      label: 'text-gray-400',
      line: 'bg-gray-300',
    }
  }

  return (
    <div className="py-4 sm:py-6">
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {NORMAL_FLOW_STATUSES.map((status, index) => {
          const state = getStatusState(status.key, index)
          const isClickable = state === 'next' && onStatusSelect
          const isSelected = selectedStatus === status.key
          const styles = getStatusStyles(state, isSelected)
          const isLast = index === NORMAL_FLOW_STATUSES.length - 1

          return (
            <div key={status.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center relative">
                {/* Circle */}
                <button
                  type="button"
                  onClick={() => isClickable && onStatusSelect(status.key)}
                  disabled={!isClickable}
                  className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center
                    transition-all duration-200 z-10 flex-shrink-0
                    ${styles.circle}
                  `}
                  title={
                    state === 'completed'
                      ? 'Completed'
                      : state === 'current'
                        ? 'Current status'
                        : state === 'next'
                          ? 'Click to select this status'
                          : 'Not available yet'
                  }
                >
                  {state === 'completed' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>

                {/* Label */}
                <span className={`mt-1 sm:mt-2 text-[10px] sm:text-xs text-center whitespace-nowrap ${styles.label}`}>
                  {status.label}
                </span>
              </div>

              {/* Connecting Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-1 sm:mx-2 relative -top-4 sm:-top-5 min-w-4">
                  <div className={`h-full ${styles.line}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Special Status Info - shown for refund statuses or failed */}
      {(isRefundStatus(currentStatus as DonationStatus) || currentStatus === 'failed') && (
        <div className="mt-6 p-4 rounded-lg border-2 border-orange-300 bg-orange-50">
          <div className="flex items-center gap-2">
            <span
              className={`
              px-3 py-1 rounded-full text-sm font-semibold
              ${
                isRefundPending(currentStatus as DonationStatus)
                  ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-400'
                  : currentStatus === 'refunded'
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-red-200 text-red-800'
              }
            `}
            >
              {currentStatus.toUpperCase().replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-700">
              {isRefundPending(currentStatus as DonationStatus) && 'This donation is being refunded'}
              {currentStatus === 'refunded' && 'This donation has been refunded'}
              {currentStatus === 'failed' && 'Payment failed'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
