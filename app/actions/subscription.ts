/**
 * Email Subscription Server Actions
 */

'use server'

import { getUserClient } from '@/lib/supabase/action-clients'
import { z } from 'zod'
import type { DonationLocale } from '@/types'
import { logger } from '@/lib/logger'
import { createSubscriptionSchema } from '@/lib/validations'

type Locale = DonationLocale

// ==================== Types ====================

export interface EmailSubscription {
  id: number
  email: string
  locale: Locale
  is_subscribed: boolean
  updated_at: string
}

export interface SubscriptionFilter {
  isSubscribed?: boolean
  locale?: Locale
  search?: string
}

// ==================== Server Actions ====================

/**
 * Create or update email subscription
 * Uses database function for idempotent upsert
 */
export async function createEmailSubscription(
  email: string,
  locale: Locale
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate input
    const validated = createSubscriptionSchema.parse({ email, locale })

    const supabase = await getUserClient()

    // Call database function for idempotent upsert
    const { data, error } = await supabase.rpc('upsert_email_subscription', {
      p_email: validated.email,
      p_locale: validated.locale
    })

    if (error) {
      logger.error('SUBSCRIPTION', 'Error creating subscription', { error: error.message })
      return { success: false, error: 'Failed to create subscription' }
    }

    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid subscription data' }
    }
    logger.errorWithStack('SUBSCRIPTION', 'Unexpected error creating subscription', error)
    return { success: false, error: 'Failed to create subscription' }
  }
}

/**
 * Get all email subscriptions (admin only)
 * Supports filtering by subscription status, locale, and email search
 */
export async function getSubscriptions(
  filter?: SubscriptionFilter
): Promise<{ data: EmailSubscription[] | null; error?: string }> {
  try {
    const supabase = await getUserClient()

    // Check admin permission
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Unauthorized' }
    }

    // 验证管理员角色
    const { data: adminCheck } = await supabase.rpc('is_admin')
    if (!adminCheck) {
      return { data: null, error: 'Forbidden' }
    }

    // Build query
    let query = supabase
      .from('email_subscriptions')
      .select('*')
      .order('updated_at', { ascending: false })

    // Apply filters
    if (filter?.isSubscribed !== undefined) {
      query = query.eq('is_subscribed', filter.isSubscribed)
    }

    if (filter?.locale) {
      query = query.eq('locale', filter.locale)
    }

    if (filter?.search) {
      query = query.ilike('email', `%${filter.search}%`)
    }

    const { data, error } = await query

    if (error) {
      logger.error('SUBSCRIPTION', 'Error fetching subscriptions', { error: error.message })
      return { data: null, error: 'Failed to fetch subscriptions' }
    }

    return { data: data as EmailSubscription[] }
  } catch (error) {
    logger.errorWithStack('SUBSCRIPTION', 'Unexpected error fetching subscriptions', error)
    return { data: null, error: 'Failed to fetch subscriptions' }
  }
}
