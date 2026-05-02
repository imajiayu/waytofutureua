'use server'

import { BASE_URL } from '@/lib/constants'
import { logger } from '@/lib/logger'
import {
  createNowPaymentsPayment,
  type CreatePaymentResponse,
  fetchAvailableCurrencies,
  type FullCurrencyInfo,
  getMinimumPaymentAmountInUsd,
} from '@/lib/payment/nowpayments/server'
import { createWayForPayPayment, type WayForPayPaymentParams } from '@/lib/payment/wayforpay/server'
import { getPublicClient } from '@/lib/supabase/action-clients'
import type { ProjectStats } from '@/types'

import {
  type DonationCreationError,
  type DonationCreationInput,
  insertPendingDonations,
  prepareDonationContext,
} from './donation/_shared'

/**
 * Failure variants shared between donation creation actions. WayForPay and
 * NOWPayments diverge only in the success shape and one extra `api_error`
 * branch (NOWPayments-only); the rest of the failure modes are byte-equal.
 */
type DonationFailure =
  | {
      success: false
      error: 'quantity_exceeded'
      remainingUnits: number
      unitName: string
      allProjectsStats: ProjectStats[]
    }
  | {
      success: false
      error: 'amount_limit_exceeded'
      maxQuantity: number
      unitName: string
      allProjectsStats: ProjectStats[]
    }
  | {
      success: false
      error: 'project_not_found' | 'project_not_active' | 'server_error'
      allProjectsStats?: ProjectStats[]
    }

type WayForPayPaymentResult =
  | {
      success: true
      paymentParams: WayForPayPaymentParams & Record<string, unknown>
      amount: number
      orderReference: string
      allProjectsStats: ProjectStats[]
    }
  | DonationFailure

type NowPaymentsResult =
  | {
      success: true
      paymentData: CreatePaymentResponse
      amount: number
      orderReference: string
      allProjectsStats: ProjectStats[]
    }
  | DonationFailure
  | { success: false; error: 'api_error'; message: string; allProjectsStats: ProjectStats[] }

/** Adapt the shared error union into the per-action `success: false` shape. */
function asActionError<T extends { success: boolean }>(err: DonationCreationError): T {
  return { success: false, ...err } as unknown as T
}

/**
 * Create WayForPay payment for donation
 */
export async function createWayForPayDonation(
  data: DonationCreationInput
): Promise<WayForPayPaymentResult> {
  try {
    const prep = await prepareDonationContext(data)
    if (!prep.ok) return asActionError<WayForPayPaymentResult>(prep.err)

    const {
      validated,
      project,
      unitPrice,
      projectAmount,
      totalAmount,
      unitName,
      projectName,
      orderReference,
      allProjectsStats,
    } = prep.ctx

    // Split donor name into first and last name
    const nameParts = validated.donor_name.trim().split(/\s+/)
    const clientFirstName = nameParts[0] || 'Donor'
    const clientLastName = nameParts.slice(1).join(' ') || 'Anonymous'

    // Determine language
    let language: 'UA' | 'EN' | 'RU' = 'UA'
    if (validated.locale === 'en') language = 'EN'
    else if (validated.locale === 'zh')
      language = 'EN' // Use EN for Chinese users
    else if (validated.locale === 'ua') language = 'UA'

    // Prepare return and callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || BASE_URL
    // Use API route to handle POST redirect from WayForPay, then redirect to success page
    const returnUrl = `${baseUrl}/api/donate/success-redirect?order=${orderReference}&locale=${validated.locale}`
    const serviceUrl = `${baseUrl}/api/webhooks/wayforpay`

    // Create WayForPay payment parameters
    // For aggregated projects: productPrice = projectAmount, productCount = 1
    // For non-aggregated projects: productPrice = unitPrice, productCount = quantity
    const paymentParams = createWayForPayPayment({
      orderReference,
      amount: totalAmount,
      currency: 'USD', // Using USD for international donations
      productName: [projectName],
      productPrice: [project.aggregate_donations ? projectAmount : unitPrice],
      productCount: [project.aggregate_donations ? 1 : validated.quantity],
      clientFirstName,
      clientLastName,
      clientEmail: validated.donor_email,
      clientPhone: validated.contact_whatsapp || validated.contact_telegram,
      language,
      returnUrl,
      serviceUrl,
    })

    // Create pending donation records
    // - If aggregate_donations = true: Create 1 aggregated record regardless of quantity
    // - If aggregate_donations = false: Create one record per unit (traditional behavior)
    // These will be updated to 'paid' status when webhook receives payment confirmation
    // SECURITY: Use anonymous client - RLS policy enforces pending status only
    await insertPendingDonations(prep.ctx, 'WayForPay')

    // Return payment parameters to client
    return {
      success: true,
      paymentParams: {
        ...paymentParams,
        // Add metadata that will be sent to widget but not used in signature
        metadata: {
          project_id: validated.project_id,
          project_name: projectName,
          quantity: validated.quantity,
          unit_price: unitPrice,
          unit_name: unitName,
          donor_name: validated.donor_name,
          donor_email: validated.donor_email,
          donor_message: validated.donor_message || '',
          contact_telegram: validated.contact_telegram || '',
          contact_whatsapp: validated.contact_whatsapp || '',
          locale: validated.locale,
        },
      },
      amount: totalAmount,
      orderReference,
      allProjectsStats,
    }
  } catch (error) {
    logger.errorWithStack('DONATION', 'Failed to create WayForPay payment', error)
    return {
      success: false,
      error: 'server_error',
    }
  }
}

/**
 * Mark donation as failed due to widget load failure
 *
 * Use case:
 * - widget_load_failed: Payment widget script failed to load (network issue)
 *
 * Note: User cancellation (closing payment window) is no longer tracked client-side.
 * WayForPay will send an 'Expired' webhook after the timeout period if payment is not completed.
 *
 * @param orderReference - The order reference to mark as failed
 * @returns Success status
 */
export async function markDonationWidgetFailed(
  orderReference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getPublicClient()

    const { error } = await supabase
      .from('donations')
      .update({ donation_status: 'widget_load_failed' })
      .eq('order_reference', orderReference)
      .eq('donation_status', 'pending')

    if (error) {
      logger.error('DONATION', 'Failed to mark as widget_load_failed', {
        orderReference,
        error: error.message,
        code: error.code,
      })
      return { success: false, error: error.message }
    }

    logger.info('DONATION', 'Marked donations as widget_load_failed', { orderReference })
    return { success: true }
  } catch (error) {
    logger.errorWithStack('DONATION', 'markDonationWidgetFailed failed', error, { orderReference })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create NOWPayments cryptocurrency donation
 */
export async function createNowPaymentsDonation(
  data: DonationCreationInput & {
    pay_currency: string // Cryptocurrency to pay with (e.g., 'usdttrc20', 'btc', 'eth')
  }
): Promise<NowPaymentsResult> {
  try {
    const prep = await prepareDonationContext(data)
    if (!prep.ok) return asActionError<NowPaymentsResult>(prep.err)

    const { validated, totalAmount, projectName, orderReference, allProjectsStats } = prep.ctx

    // Note: Minimum amount check removed - let NOWPayments API handle it
    // The API will return specific error messages for amounts that are too small

    // Create NOWPayments payment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || BASE_URL
    const ipnCallbackUrl = `${baseUrl}/api/webhooks/nowpayments`
    const successUrl = `${baseUrl}/${validated.locale}/donate/success?order=${orderReference}`

    let paymentData: CreatePaymentResponse
    try {
      paymentData = await createNowPaymentsPayment({
        price_amount: totalAmount,
        price_currency: 'usd',
        pay_currency: data.pay_currency,
        ipn_callback_url: ipnCallbackUrl,
        order_id: orderReference,
        order_description: `Donation to ${projectName}`,
        success_url: successUrl,
      })
    } catch (error) {
      logger.error('DONATION', 'NOWPayments API error', {
        error: error instanceof Error ? error.message : String(error),
      })
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const cleanMessage = errorMessage.replace('NOWPayments API error: ', '')
      return {
        success: false,
        error: 'api_error',
        message: cleanMessage,
        allProjectsStats,
      }
    }

    // Create pending donation records
    await insertPendingDonations(prep.ctx, 'NOWPayments')

    return {
      success: true,
      paymentData,
      amount: totalAmount,
      orderReference,
      allProjectsStats,
    }
  } catch (error) {
    logger.errorWithStack('DONATION', 'Failed to create NOWPayments donation', error)
    return {
      success: false,
      error: 'server_error',
    }
  }
}

/**
 * Currency info for frontend display
 */
export interface CurrencyInfo {
  code: string
  name: string
  logoUrl: string
  network: string
  isPopular: boolean
  isStable: boolean
}

/**
 * Get available cryptocurrencies from NOWPayments with full info
 */
export async function getNowPaymentsCurrencies(): Promise<{
  success: boolean
  currencies?: CurrencyInfo[]
  error?: string
}> {
  try {
    const fullCurrencies = await fetchAvailableCurrencies()

    // Transform to frontend-friendly format
    const currencies: CurrencyInfo[] = fullCurrencies.map((c: FullCurrencyInfo) => ({
      code: c.code.toLowerCase(),
      name: c.name,
      logoUrl: `https://nowpayments.io${c.logo_url}`,
      network: c.network,
      isPopular: c.is_popular,
      isStable: c.is_stable,
    }))

    return { success: true, currencies }
  } catch (error) {
    logger.error('DONATION', 'Failed to fetch currencies', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch currencies',
    }
  }
}

/**
 * Get minimum payment amount in USD for a specific pay currency
 * Queries the real minimum based on crypto -> outcome wallet conversion
 */
export async function getNowPaymentsMinimum(payCurrency: string): Promise<{
  success: boolean
  minAmount?: number
  error?: string
}> {
  try {
    // Get minimum in USD for the selected pay currency
    // This queries payCurrency -> usdttrc20 minimum, then converts to USD
    const minAmount = await getMinimumPaymentAmountInUsd(payCurrency)
    return { success: true, minAmount }
  } catch (error) {
    logger.error('DONATION', 'Failed to fetch minimum amount', {
      payCurrency,
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch minimum amount',
    }
  }
}
