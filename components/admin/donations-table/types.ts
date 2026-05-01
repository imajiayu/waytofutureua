import type { I18nText } from '@/types'
import type { Database } from '@/types/database'

export type Donation = Database['public']['Tables']['donations']['Row'] & {
  projects: { project_name: string; project_name_i18n: I18nText }
}

export type StatusHistory = Database['public']['Tables']['donation_status_history']['Row']

export interface DonationGroup {
  orderReference: string | null
  donations: Donation[]
  totalAmount: number
}

export interface DonationTableFilters {
  status: string
  project: string
}

export interface UniqueProject {
  id: number
  name: string
}
