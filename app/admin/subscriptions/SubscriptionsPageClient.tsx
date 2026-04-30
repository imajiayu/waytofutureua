/**
 * Admin Subscriptions Page Client Component
 * Client-side logic for subscriptions management
 */

'use client'

import { useState } from 'react'

import { EmailSubscription } from '@/app/actions/subscription'
import BroadcastModal, { Subscriber } from '@/components/admin/BroadcastModal'
import EmailHistory from '@/components/admin/EmailHistory'
import SubscriptionsTable from '@/components/admin/SubscriptionsTable'
import type { AppLocale } from '@/types'

interface SubscriptionsPageClientProps {
  initialSubscriptions: EmailSubscription[]
}

export default function SubscriptionsPageClient({
  initialSubscriptions,
}: SubscriptionsPageClientProps) {
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  // Convert to Subscriber format for BroadcastModal
  const subscribers: Subscriber[] = initialSubscriptions.map((s) => ({
    email: s.email,
    locale: s.locale as AppLocale,
    is_subscribed: s.is_subscribed,
  }))

  const handleSendBroadcast = () => {
    setIsBroadcastModalOpen(true)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div>
        <h1 className="font-body text-3xl font-bold text-gray-900">Email Subscriptions</h1>
        <p className="mt-2 text-gray-600">
          Manage newsletter subscriptions and send broadcast emails to your subscribers
        </p>
      </div>

      {/* Subscriptions Table */}
      <SubscriptionsTable
        subscriptions={initialSubscriptions}
        onSendBroadcast={handleSendBroadcast}
      />

      {/* Email Send History */}
      <EmailHistory refreshKey={historyRefreshKey} />

      {/* Broadcast Modal */}
      <BroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        subscribers={subscribers}
        onSent={() => setHistoryRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
