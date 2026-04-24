/**
 * Email History Component
 * Admin-only view of recent emails sent via Resend, with live status badges.
 *
 * Data is fetched from Resend's /emails endpoint — no local persistence.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { clientLogger } from '@/lib/logger-client'
import { formatDateTime } from '@/lib/i18n-utils'
import { SpinnerIcon } from '@/components/icons'
import {
  listEmailHistory,
  type EmailHistoryItem,
  type EmailLastEvent,
} from '@/app/actions/email-history'

interface EmailHistoryProps {
  /** Bump this value to force a re-fetch (e.g. after sending a broadcast) */
  refreshKey?: number
}

const STATUS_STYLES: Record<EmailLastEvent, string> = {
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  opened: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  clicked: 'bg-teal-50 text-teal-700 border-teal-200',
  queued: 'bg-gray-50 text-gray-700 border-gray-200',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  delivery_delayed: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  bounced: 'bg-red-50 text-red-700 border-red-200',
  complained: 'bg-red-50 text-red-700 border-red-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  canceled: 'bg-gray-100 text-gray-600 border-gray-300',
}

function StatusBadge({ event }: { event: EmailLastEvent | null }) {
  if (!event) {
    return (
      <span className="inline-flex px-2 py-0.5 rounded-full border text-xs font-medium bg-gray-50 text-gray-500 border-gray-200">
        unknown
      </span>
    )
  }
  const className = STATUS_STYLES[event] ?? 'bg-gray-50 text-gray-700 border-gray-200'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${className}`}>
      {event.replace(/_/g, ' ')}
    </span>
  )
}

function RecipientsList({ item }: { item: EmailHistoryItem }) {
  const all = [
    ...item.to.map((addr) => ({ kind: 'To', addr })),
    ...item.cc.map((addr) => ({ kind: 'Cc', addr })),
    ...item.bcc.map((addr) => ({ kind: 'Bcc', addr })),
  ]
  if (all.length === 0) return <span className="text-gray-400">—</span>
  const primary = all[0]
  const rest = all.length - 1
  return (
    <div className="text-xs text-gray-700 max-w-xs truncate" title={all.map((r) => `${r.kind}: ${r.addr}`).join('\n')}>
      <span className="text-gray-400">{primary.kind}:</span> {primary.addr}
      {rest > 0 && <span className="ml-1 text-gray-400">(+{rest} more)</span>}
    </div>
  )
}

export default function EmailHistory({ refreshKey = 0 }: EmailHistoryProps) {
  const [items, setItems] = useState<EmailHistoryItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await listEmailHistory()
      if (res.error || !res.data) {
        setError(res.error ?? 'Failed to load email history')
        return
      }
      setItems(res.data.items)
      setHasMore(res.data.hasMore)
      setLastFetchedAt(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load email history'
      clientLogger.error('API', 'EmailHistory load failed', { error: message })
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <section className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Email History</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Latest {items.length} emails from Resend
            {hasMore && ' · more available on the Resend dashboard'}
            {lastFetchedAt && ` · fetched ${formatDateTime(lastFetchedAt.toISOString())}`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="animate-spin h-4 w-4" />
              Refreshing…
            </>
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 sm:px-6 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Body */}
      {isLoading && items.length === 0 ? (
        <div className="px-4 sm:px-6 py-12 text-center text-sm text-gray-500">
          <SpinnerIcon className="animate-spin h-5 w-5 inline-block mr-2" />
          Loading email history…
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 sm:px-6 py-12 text-center text-sm text-gray-500">
          No emails sent yet.
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 max-w-sm">
                      <div className="truncate" title={item.subject}>
                        {item.subject || <span className="text-gray-400">(no subject)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <RecipientsList item={item} />
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 max-w-xs truncate" title={item.from}>
                      {item.from}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge event={item.lastEvent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="md:hidden divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {item.subject || <span className="text-gray-400">(no subject)</span>}
                  </div>
                  <StatusBadge event={item.lastEvent} />
                </div>
                <RecipientsList item={item} />
                <div className="text-xs text-gray-500">{formatDateTime(item.createdAt)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
