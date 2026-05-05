import type { DonationStatus } from '@/lib/donation-status'
import type { I18nText } from '@/types'

export type TrackDonation = {
  id: number
  donation_public_id: string
  order_reference: string
  donor_email: string
  amount: number
  currency: string
  donation_status: DonationStatus
  donated_at: string
  updated_at: string
  projects: {
    id: number
    project_name_i18n: I18nText | null
    unit_name_i18n: I18nText | null
    aggregate_donations: boolean | null
  }
}
