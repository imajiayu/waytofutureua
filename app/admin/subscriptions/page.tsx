/**
 * Admin Subscriptions Page
 * Manage email subscriptions and send newsletter broadcasts
 */

import { redirect } from 'next/navigation'

import { getSubscriptions } from '@/app/actions/subscription'
import { createServerClient } from '@/lib/supabase/server'

import SubscriptionsPageClient from './SubscriptionsPageClient'

export const metadata = {
  title: 'Email Subscriptions - Admin',
  description: 'Manage email subscriptions and send newsletter broadcasts',
}

export default async function SubscriptionsPage() {
  // Check authentication
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  // Verify admin role
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    redirect('/admin/login')
  }

  // Fetch all subscriptions
  const { data: subscriptions, error } = await getSubscriptions()

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-700">Error loading subscriptions: {error}</p>
        </div>
      </div>
    )
  }

  return <SubscriptionsPageClient initialSubscriptions={subscriptions || []} />
}
