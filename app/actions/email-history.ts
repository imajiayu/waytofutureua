/**
 * Email History Server Actions
 * Admin-only: read-only view of recent emails sent via Resend.
 *
 * No local persistence — the source of truth is Resend's `/emails` API,
 * which also tracks post-send events (delivered, bounced, opened, etc.).
 */

'use server'

import { resend } from '@/lib/email/client'
import { logger } from '@/lib/logger'
import { getAdminClient } from '@/lib/supabase/action-clients'

export type EmailLastEvent =
  | 'bounced'
  | 'canceled'
  | 'clicked'
  | 'complained'
  | 'delivered'
  | 'delivery_delayed'
  | 'failed'
  | 'opened'
  | 'queued'
  | 'scheduled'
  | 'sent'

export interface EmailHistoryItem {
  id: string
  createdAt: string
  from: string
  to: string[]
  bcc: string[]
  cc: string[]
  replyTo: string[]
  subject: string
  lastEvent: EmailLastEvent | null
  scheduledAt: string | null
}

export interface EmailHistoryResult {
  items: EmailHistoryItem[]
  hasMore: boolean
}

const EMAIL_HISTORY_LIMIT = 100

export async function listEmailHistory(): Promise<{
  data: EmailHistoryResult | null
  error?: string
}> {
  try {
    await getAdminClient()

    const { data, error } = await resend.emails.list({ limit: EMAIL_HISTORY_LIMIT })

    if (error) {
      logger.error('EMAIL', 'Failed to list Resend email history', {
        error: error.message,
      })
      return { data: null, error: error.message }
    }

    if (!data) {
      return { data: { items: [], hasMore: false } }
    }

    const items: EmailHistoryItem[] = data.data.map((e) => ({
      id: e.id,
      createdAt: e.created_at,
      from: e.from,
      to: e.to ?? [],
      bcc: e.bcc ?? [],
      cc: e.cc ?? [],
      replyTo: e.reply_to ?? [],
      subject: e.subject,
      lastEvent: (e.last_event as EmailLastEvent | null) ?? null,
      scheduledAt: e.scheduled_at,
    }))

    return {
      data: {
        items,
        hasMore: data.has_more,
      },
    }
  } catch (err) {
    logger.errorWithStack('EMAIL', 'Error listing email history', err)
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to list email history',
    }
  }
}
