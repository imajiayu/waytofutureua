/**
 * Email History Component
 * Admin-only view of recent emails sent via Resend, with live status badges.
 *
 * Data is fetched from Resend's /emails endpoint — no local persistence.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import {
  type EmailHistoryItem,
  type EmailLastEvent,
  listEmailHistory,
} from '@/app/actions/email-history'
import { SpinnerIcon } from '@/components/icons'
import { formatDateTime } from '@/lib/i18n-utils'
import { clientLogger } from '@/lib/logger-client'

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
      <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">
        unknown
      </span>
    )
  }
  const className = STATUS_STYLES[event] ?? 'bg-gray-50 text-gray-700 border-gray-200'
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
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
    <div
      className="max-w-xs truncate text-xs text-gray-700"
      title={all.map((r) => `${r.kind}: ${r.addr}`).join('\n')}
    >
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
    <section className="rounded-lg border border-gray-200 bg-white shadow">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Email History</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Latest {items.length} emails from Resend
            {hasMore && ' · more available on the Resend dashboard'}
            {lastFetchedAt && ` · fetched ${formatDateTime(lastFetchedAt.toISOString())}`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Refreshing…
            </>
          ) : (
            'Refresh'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-6">
          {error}
        </div>
      )}

      {/* Body */}
      {isLoading && items.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-gray-500 sm:px-6">
          <SpinnerIcon className="mr-2 inline-block h-5 w-5 animate-spin" />
          Loading email history…
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-gray-500 sm:px-6">
          No emails sent yet.
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sent
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Subject
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recipient
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    From
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-600">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="max-w-sm px-4 py-2 text-sm text-gray-900">
                      <div className="truncate" title={item.subject}>
                        {item.subject || <span className="text-gray-400">(no subject)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <RecipientsList item={item} />
                    </td>
                    <td
                      className="max-w-xs truncate px-4 py-2 text-xs text-gray-600"
                      title={item.from}
                    >
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
          <ul className="divide-y divide-gray-100 md:hidden">
            {items.map((item) => (
              <li key={item.id} className="space-y-1.5 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate text-sm font-medium text-gray-900">
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
