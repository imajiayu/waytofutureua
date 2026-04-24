/**
 * Admin Subscriptions Page Client Component
 * Client-side logic for subscriptions management
 */

'use client'

import { useState } from 'react'
import { EmailSubscription } from '@/app/actions/subscription'
import SubscriptionsTable from '@/components/admin/SubscriptionsTable'
import BroadcastModal, { Subscriber } from '@/components/admin/BroadcastModal'
import EmailHistory from '@/components/admin/EmailHistory'
import type { DonationLocale } from '@/types'

interface SubscriptionsPageClientProps {
  initialSubscriptions: EmailSubscription[]
}

export default function SubscriptionsPageClient({
  initialSubscriptions
}: SubscriptionsPageClientProps) {
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  // Convert to Subscriber format for BroadcastModal
  const subscribers: Subscriber[] = initialSubscriptions.map((s) => ({
    email: s.email,
    locale: s.locale as DonationLocale,
    is_subscribed: s.is_subscribed
  }))

  const handleSendBroadcast = () => {
    setIsBroadcastModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-body">Email Subscriptions</h1>
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
