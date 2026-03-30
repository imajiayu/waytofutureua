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
  onSendBroadcast
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
    ua: subscriptions.filter((s) => s.locale === 'ua' && s.is_subscribed).length
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">Total Subscribers</div>
          <div className="text-2xl font-bold text-gray-900">{totalSubscriptions}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
          <div className="text-sm text-green-700 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-900">{activeSubscriptions}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
          <div className="text-sm text-red-700 mb-1">Unsubscribed</div>
          <div className="text-2xl font-bold text-red-900">{unsubscribedCount}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
          <div className="text-sm text-blue-700 mb-1">By Language</div>
          <div className="text-sm font-medium text-blue-900">
            EN: {localeCounts.en} | ZH: {localeCounts.zh} | UA: {localeCounts.ua}
          </div>
        </div>
      </div>

      {/* Broadcast Button */}
      <div className="bg-ukraine-blue-50 p-4 sm:p-6 rounded-lg border border-ukraine-blue-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 font-body">
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
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base flex-shrink-0"
          >
            Send Broadcast
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Email
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>

          {/* Locale Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select
              value={localeFilter}
              onChange={(e) => setLocaleFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
      <div className="sm:hidden space-y-2">
        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
            No subscriptions found
          </div>
        ) : (
          filteredSubscriptions.map((subscription) => (
            <div key={subscription.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm text-gray-900 truncate min-w-0 flex-1">
                  {subscription.email}
                </div>
                {subscription.is_subscribed ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 flex-shrink-0">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 flex-shrink-0">
                    Unsubscribed
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500">
                <span className="px-2 py-0.5 font-medium rounded-full bg-gray-100 text-gray-800">
                  {subscription.locale.toUpperCase()}
                </span>
                <span>{formatDateTime(subscription.updated_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No subscriptions found
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {subscription.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {subscription.locale.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscription.is_subscribed ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(subscription.updated_at)}
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
