/**
 * Webhook → email payload builders.
 *
 * Both donation webhooks (WayForPay + NOWPayments) produce byte-equal
 * `donationItems` / refund-payload shapes; the only differences are which
 * webhook supplies the currency and whether a refund reason is available.
 * Centralising the projects lookup + i18n cast pattern here removes ~60 LOC
 * of copy-paste from each route handler.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

import type { AppLocale, Database } from '@/types'

import type { I18nText, PaymentSuccessEmailParams, RefundSuccessEmailParams } from './types'

type SupabaseServiceClient = SupabaseClient<Database>

/** Empty i18n fallback used when a project lookup misses a row — preserves
 *  the strict `{ en: string; zh: string; ua: string }` shape required by
 *  the email senders. */
const EMPTY_I18N: I18nText = { en: '', zh: '', ua: '' }

/** Donation row shape needed to assemble webhook email payloads. */
export interface DonationForEmail {
  donation_public_id: string
  project_id: number
  amount: number
  donor_email: string
  donor_name: string
  locale: string | null
}

async function loadProjectMap(
  supabase: SupabaseServiceClient,
  donations: ReadonlyArray<DonationForEmail>
) {
  const projectIds = [...new Set(donations.map((d) => d.project_id))]
  const { data: projects } = await supabase
    .from('projects')
    .select('id, project_name_i18n, location_i18n, unit_name_i18n, aggregate_donations')
    .in('id', projectIds)
  if (!projects || projects.length === 0) return null
  return new Map(projects.map((p) => [p.id, p]))
}

/**
 * Resolve project metadata + assemble the full `sendPaymentSuccessEmail`
 * payload from a batch of paid donations sharing one orderReference.
 * Returns `null` when projects fail to load — caller should skip the send.
 */
export async function buildPaymentSuccessPayload(
  supabase: SupabaseServiceClient,
  updatedDonations: ReadonlyArray<DonationForEmail>,
  currency: string
): Promise<PaymentSuccessEmailParams | null> {
  if (updatedDonations.length === 0) return null

  const projectMap = await loadProjectMap(supabase, updatedDonations)
  if (!projectMap) return null

  const firstDonation = updatedDonations[0]

  const donationItems = updatedDonations.map((donation) => {
    const project = projectMap.get(donation.project_id)
    return {
      donationPublicId: donation.donation_public_id,
      projectNameI18n: (project?.project_name_i18n || EMPTY_I18N) as I18nText,
      locationI18n: (project?.location_i18n || EMPTY_I18N) as I18nText,
      unitNameI18n: (project?.unit_name_i18n || EMPTY_I18N) as I18nText,
      amount: Number(donation.amount),
      isAggregate: project?.aggregate_donations === true,
    }
  })

  return {
    to: firstDonation.donor_email,
    donorName: firstDonation.donor_name,
    donations: donationItems,
    totalAmount: updatedDonations.reduce((sum, d) => sum + Number(d.amount), 0),
    currency,
    locale: firstDonation.locale as AppLocale,
  }
}

/**
 * Resolve project metadata + assemble the full `sendRefundSuccessEmail`
 * payload. `refundReason` is only set when the WayForPay refund webhook
 * provides a textual reason; NOWPayments never supplies one.
 */
export async function buildRefundSuccessPayload(
  supabase: SupabaseServiceClient,
  updatedDonations: ReadonlyArray<DonationForEmail>,
  currency: string,
  refundReason?: string
): Promise<RefundSuccessEmailParams | null> {
  if (updatedDonations.length === 0) return null

  const projectMap = await loadProjectMap(supabase, updatedDonations)
  if (!projectMap) return null

  const firstDonation = updatedDonations[0]
  const project = projectMap.get(firstDonation.project_id)
  if (!project) return null

  return {
    to: firstDonation.donor_email,
    donorName: firstDonation.donor_name,
    projectNameI18n: project.project_name_i18n as I18nText,
    donationIds: updatedDonations.map((d) => d.donation_public_id),
    refundAmount: updatedDonations.reduce((sum, d) => sum + Number(d.amount), 0),
    currency,
    locale: firstDonation.locale as AppLocale,
    ...(refundReason !== undefined ? { refundReason } : {}),
  }
}
