/**
 * Subscriptions Table Component
 * Displays and manages email subscriptions
 */

'use client'

import { useState } from 'react'

import { EmailSubscription } from '@/app/actions/subscription'
import { formatDateTime } from '@/lib/i18n-utils'

interface SubscriptionsTableProps {
  subscriptions: EmailSubscription[]
  onSendBroadcast: () => void
}

export default function SubscriptionsTable({
  subscriptions,
  onSendBroadcast,
}: SubscriptionsTableProps) {
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [localeFilter, setLocaleFilter] = useState<'all' | 'en' | 'zh' | 'ua'>('all')

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    // Status filter
    if (filter === 'subscribed' && !sub.is_subscribed) return false
    if (filter === 'unsubscribed' && sub.is_subscribed) return false

    // Locale filter
    if (localeFilter !== 'all' && sub.locale !== localeFilter) return false

    // Search filter
    if (searchTerm && !sub.email.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }

    return true
  })

  // Calculate statistics
  const totalSubscriptions = subscriptions.length
  const activeSubscriptions = subscriptions.filter((s) => s.is_subscribed).length
  const unsubscribedCount = totalSubscriptions - activeSubscriptions

  // Locale counts
  const localeCounts = {
    en: subscriptions.filter((s) => s.locale === 'en' && s.is_subscribed).length,
    zh: subscriptions.filter((s) => s.locale === 'zh' && s.is_subscribed).length,
    ua: subscriptions.filter((s) => s.locale === 'ua' && s.is_subscribed).length,
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
          <div className="mb-1 text-sm text-gray-500">Total Subscribers</div>
          <div className="text-2xl font-bold text-gray-900">{totalSubscriptions}</div>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow">
          <div className="mb-1 text-sm text-green-700">Active</div>
          <div className="text-2xl font-bold text-green-900">{activeSubscriptions}</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow">
          <div className="mb-1 text-sm text-red-700">Unsubscribed</div>
          <div className="text-2xl font-bold text-red-900">{unsubscribedCount}</div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow">
          <div className="mb-1 text-sm text-blue-700">By Language</div>
          <div className="text-sm font-medium text-blue-900">
            EN: {localeCounts.en} | ZH: {localeCounts.zh} | UA: {localeCounts.ua}
          </div>
        </div>
      </div>

      {/* Broadcast Button */}
      <div className="rounded-lg border border-ukraine-blue-200 bg-ukraine-blue-50 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="mb-1 font-body text-base font-semibold text-gray-900 sm:text-lg">
              Send Newsletter Broadcast
            </h3>
            <p className="text-sm text-gray-600">
              Send new project announcements to all active subscribers ({activeSubscriptions}{' '}
              recipients)
            </p>
          </div>
          <button
            onClick={onSendBroadcast}
            disabled={activeSubscriptions === 0}
            className="w-full flex-shrink-0 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto sm:text-base"
          >
            Send Broadcast
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Search Email</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>

          {/* Locale Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Language</label>
            <select
              value={localeFilter}
              onChange={(e) => setLocaleFilter(e.target.value as any)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Languages</option>
              <option value="en">English</option>
              <option value="zh">Chinese</option>
              <option value="ua">Українська</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredSubscriptions.length} of {totalSubscriptions} subscriptions
      </div>

      {/* Mobile card view */}
      <div className="space-y-2 sm:hidden">
        {filteredSubscriptions.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white py-8 text-center text-gray-500">
            No subscriptions found
          </div>
        ) : (
          filteredSubscriptions.map((subscription) => (
            <div key={subscription.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 truncate text-sm text-gray-900">
                  {subscription.email}
                </div>
                {subscription.is_subscribed ? (
                  <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Unsubscribed
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-800">
                  {subscription.locale.toUpperCase()}
                </span>
                <span suppressHydrationWarning>{formatDateTime(subscription.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white shadow sm:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {subscription.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                        {subscription.locale.toUpperCase()}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {subscription.is_subscribed ? (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                          Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <span suppressHydrationWarning>
                        {formatDateTime(subscription.updated_at)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
