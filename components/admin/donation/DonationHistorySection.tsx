'use client'

import { formatDateTime } from '@/lib/i18n-utils'
import type { Database } from '@/types/database'

type StatusHistory = Database['public']['Tables']['donation_status_history']['Row']

interface Props {
  statusHistory: StatusHistory[]
}

export default function DonationHistorySection({ statusHistory }: Props) {
  if (statusHistory.length === 0) return null

  return (
    <div className="rounded-lg bg-purple-50 p-4">
      <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Status Change History</h3>
      <div className="space-y-2">
        {statusHistory.map((history) => (
          <div
            key={history.id}
            className="flex flex-wrap items-center gap-2 rounded bg-white p-2 text-sm text-gray-700"
          >
            <span className="font-data text-xs text-gray-500">
              {formatDateTime(history.changed_at, 'zh', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <span className="text-gray-400">→</span>
            {history.from_status && (
              <>
                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {history.from_status}
                </span>
                <span className="text-gray-400">→</span>
              </>
            )}
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {history.to_status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
