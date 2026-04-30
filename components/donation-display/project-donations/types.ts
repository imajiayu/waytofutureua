import type { DonationStatus } from '@/lib/donation-status'

export type ProjectDonation = {
  id: number
  donation_public_id: string
  donor_email_obfuscated: string | null
  /** MD5 hash for grouping donations from the same payment. */
  order_id: string
  amount: number
  currency: string
  donation_status: DonationStatus
  donated_at: string
  updated_at: string
}
