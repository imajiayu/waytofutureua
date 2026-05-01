/**
 * Centralized DTOs for Server Actions and API Routes.
 *
 * Use this file for non-trivial composite shapes (RPC returns, joined queries,
 * action results) that don't naturally live in `database.ts` (auto-generated).
 */

import type { DonationStatus } from '@/lib/donation-status'
import type { Donation, I18nText } from '@/types'
import type { MarketOrder } from '@/types/market'

/**
 * Row shape returned by RPC `get_donations_by_email_verified(p_email, p_donation_id)`.
 *
 * Source: supabase/migrations/20260109000000_baseline.sql line 99 (RETURNS TABLE).
 * Columns ordered to match the SQL declaration.
 */
export interface DonationByContactRow {
  id: number
  donation_public_id: string
  order_reference: string
  project_id: number
  donor_email: string
  amount: number
  currency: string
  donation_status: DonationStatus
  donated_at: string
  updated_at: string
  project_name: string
  project_name_i18n: I18nText | null
  location: string
  location_i18n: I18nText | null
  unit_name: string
  unit_name_i18n: I18nText | null
  aggregate_donations: boolean
}

/**
 * Row shape exposed by view `order_donations_secure`.
 *
 * Source: supabase/migrations/20260109000000_baseline.sql line 721 (CREATE VIEW).
 * Email is obfuscated; donor_name is intentionally absent.
 */
/**
 * Admin donations list item — donation row with embedded project name.
 *
 * Source: getAdminDonations() in app/actions/admin.ts (joined select).
 */
export type AdminDonationListItem = Donation & {
  projects: { project_name: string; project_name_i18n: I18nText }
}

/**
 * Buyer-side market order — order row with embedded item title.
 *
 * Source: getMyOrders() in app/actions/market-order.ts (joined select).
 */
export type BuyerMarketOrder = MarketOrder & {
  market_items: { title_i18n: I18nText } | null
}

export interface OrderDonationsSecureRow {
  id: number
  donation_public_id: string
  amount: number
  donation_status: DonationStatus
  order_reference: string
  donor_email_obfuscated: string
  project_id: number
  project_name: string
  project_name_i18n: I18nText | null
  location: string
  location_i18n: I18nText | null
  unit_name: string
  unit_name_i18n: I18nText | null
  aggregate_donations: boolean
}
