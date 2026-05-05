import type { Tables, Json } from './database'
import { DONATION_STATUSES, type DonationStatus } from '@/lib/donation-status'

// Re-export database types
export * from './database'

// Re-export donation status types from centralized library
export { DONATION_STATUSES, type DonationStatus }

// I18n text type (used for multilingual fields)
export type I18nText = { en?: string; zh?: string; ua?: string }

// Application-level types
export type Project = Tables<'projects'>
export type Donation = Tables<'donations'>
export type ProjectStats = Tables<'project_stats'>

// Note: Form types (CreateProjectInput, UpdateProjectInput, CreateDonationInput)
// are defined in lib/validations.ts via Zod schema inference

// Filter and search types
export interface ProjectFilters {
  status?: 'planned' | 'active' | 'completed' | 'paused'
  is_long_term?: boolean
  search?: string
}

// Constants (internal, used for type derivation)
const PROJECT_STATUSES = ['planned', 'active', 'completed', 'paused'] as const

/**
 * Donation Status Values
 *
 * Pre-payment:
 * - pending: Order created, awaiting payment
 * - widget_load_failed: Payment widget failed to load (network issue)
 *
 * Processing:
 * - processing: Payment being processed by gateway (WayForPay inProcessing)
 * - fraud_check: Under anti-fraud verification (WayForPay Pending)
 *
 * Payment Complete:
 * - paid: Payment successful, funds received
 * - confirmed: Platform confirmed the donation
 * - delivering: Items being delivered
 * - completed: Delivery completed
 *
 * Payment Failed:
 * - expired: Payment timeout (WayForPay Expired) - also used when user abandons payment
 * - declined: Bank declined the payment (WayForPay Declined)
 * - failed: Other payment failures
 *
 * Refund:
 * - refunding: Refund requested by donor
 * - refund_processing: Refund being processed (WayForPay RefundInProcessing)
 * - refunded: Refund completed (includes WayForPay Refunded and Voided)
 *
 * Note: user_cancelled was removed - pending donations that are never completed
 * will be marked as 'expired' by WayForPay's authoritative webhook.
 *
 * @see docs/PAYMENT_WORKFLOW.md
 * @see lib/donation-status.ts for helper functions and status groups
 */
// Note: DONATION_STATUSES and DonationStatus are re-exported at the top of this file

// Application locale (single source of truth)
export const VALID_LOCALES = ['en', 'zh', 'ua'] as const
export type AppLocale = (typeof VALID_LOCALES)[number]
export const isAppLocale = (x: unknown): x is AppLocale =>
  typeof x === 'string' && (VALID_LOCALES as readonly string[]).includes(x)

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

// Project Results - for displaying project outcomes/achievements
export interface ProjectResult {
  imageUrl: string
  caption: string
  date?: string // ISO 8601 format: YYYY-MM-DD
  priority?: number // Higher priority = displayed first (default: 5)
  projectId?: number // Optional: link to source project
}
