'use server'

import { createWayForPayPayment } from '@/lib/payment/wayforpay/server'
import {
  createNowPaymentsPayment,
  fetchAvailableCurrencies,
  getMinimumPaymentAmountInUsd,
  type CreatePaymentResponse,
  type FullCurrencyInfo
} from '@/lib/payment/nowpayments/server'
import { getProjectStats } from '@/lib/supabase/queries'
import { donationFormSchema } from '@/lib/validations'
import { getPublicClient } from '@/lib/supabase/action-clients'
import type { DonationStatus, ProjectStats } from '@/types'
import { getProjectName, getUnitName, type SupportedLocale } from '@/lib/i18n-utils'
import { logger } from '@/lib/logger'

type WayForPayPaymentResult =
  | { success: true; paymentParams: any; amount: number; orderReference: string; allProjectsStats: ProjectStats[] }
  | { success: false; error: 'quantity_exceeded'; remainingUnits: number; unitName: string; allProjectsStats: ProjectStats[] }
  | { success: false; error: 'amount_limit_exceeded'; maxQuantity: number; unitName: string; allProjectsStats: ProjectStats[] }
  | { success: false; error: 'project_not_found' | 'project_not_active' | 'server_error'; allProjectsStats?: ProjectStats[] }

type NowPaymentsResult =
  | { success: true; paymentData: CreatePaymentResponse; amount: number; orderReference: string; allProjectsStats: ProjectStats[] }
  | { success: false; error: 'quantity_exceeded'; remainingUnits: number; unitName: string; allProjectsStats: ProjectStats[] }
  | { success: false; error: 'amount_limit_exceeded'; maxQuantity: number; unitName: string; allProjectsStats: ProjectStats[] }
  | { success: false; error: 'api_error'; message: string; allProjectsStats: ProjectStats[] }
  | { success: false; error: 'project_not_found' | 'project_not_active' | 'server_error'; allProjectsStats?: ProjectStats[] }

/**
 * Helper function: Create quantity exceeded error
 */
function createQuantityExceededError(
  remainingUnits: number,
  unitName: string,
  allProjectsStats: ProjectStats[]
): WayForPayPaymentResult {
  return {
    success: false,
    error: 'quantity_exceeded',
    remainingUnits,
    unitName,
    allProjectsStats,
  }
}

/**
 * Helper function: Create amount limit exceeded error
 */
function createAmountLimitExceededError(
  maxQuantity: number,
  unitName: string,
  allProjectsStats: ProjectStats[]
): WayForPayPaymentResult {
  return {
    success: false,
    error: 'amount_limit_exceeded',
    maxQuantity,
    unitName,
    allProjectsStats,
  }
}

/**
 * Create WayForPay payment for donation
 */
export async function createWayForPayDonation(data: {
  project_id: number
  quantity: number
  amount?: number // For aggregated projects: direct donation amount
  donor_name: string
  donor_email: string
  donor_message?: string
  contact_telegram?: string
  contact_whatsapp?: string
  tip_amount?: number
  locale: 'en' | 'zh' | 'ua'
}): Promise<WayForPayPaymentResult> {
  try {
    // Validate input
    const validated = donationFormSchema.parse(data)

    // Get all projects stats (includes the specific project we need)
    const allProjectsStats = await getProjectStats() as ProjectStats[]
    const project = allProjectsStats.find((p) => p.id === validated.project_id)

    if (!project) {
      return {
        success: false,
        error: 'project_not_found',
        allProjectsStats,
      }
    }

    if (project.status !== 'active') {
      return {
        success: false,
        error: 'project_not_active',
        allProjectsStats,
      }
    }

    // Get localized unit name for error messages
    const unitName = getUnitName(
      project.unit_name_i18n,
      project.unit_name,
      validated.locale as SupportedLocale
    )

    // Calculate project amount based on project type
    const unitPrice = project.unit_price ?? 0
    let projectAmount: number

    if (project.aggregate_donations) {
      // Aggregated projects: Use the amount passed from frontend
      if (!validated.amount || validated.amount <= 0) {
        return {
          success: false,
          error: 'server_error',
        }
      }
      projectAmount = validated.amount
    } else {
      // Non-aggregated projects: Calculate from unit_price * quantity
      projectAmount = unitPrice * validated.quantity
    }

    // Check limits for non-long-term projects (target-based limits only)
    if (!project.is_long_term) {
      if (project.aggregate_donations) {
        // For aggregated projects: target_units represents target amount (not units)
        // Check if donation amount exceeds remaining target
        const targetAmount = project.target_units || 0
        const currentAmount = project.total_raised || 0
        const remainingAmount = targetAmount - currentAmount

        if (projectAmount > remainingAmount) {
          // Return error with remaining amount info
          return createAmountLimitExceededError(
            Math.floor(remainingAmount), // Use maxQuantity to pass remaining amount
            'USD', // For aggregated projects, unit is currency
            allProjectsStats
          )
        }
      } else {
        // For non-aggregated projects: check quantity limits
        const remainingUnits = (project.target_units || 0) - (project.current_units || 0)
        if (validated.quantity > remainingUnits) {
          return createQuantityExceededError(remainingUnits, unitName, allProjectsStats)
        }
      }
    }

    const totalAmount = projectAmount + (validated.tip_amount || 0)

    // =====================================================
    // CRITICAL: Check total amount limit for ALL projects
    // Maximum $10,000 per transaction (RLS policy limit)
    // This is the ONLY place where we check the $10,000 limit
    // (Long-term, non-long-term, aggregated, non-aggregated)
    // =====================================================
    if (totalAmount > 10000) {
      // Calculate max allowed based on project type
      if (project.aggregate_donations) {
        // Aggregated: return max amount directly (in USD)
        return createAmountLimitExceededError(10000, 'USD', allProjectsStats)
      } else {
        // Non-aggregated: calculate max units based on unit price
        const maxQuantity = Math.floor(10000 / unitPrice)
        return createAmountLimitExceededError(maxQuantity, unitName, allProjectsStats)
      }
    }

    // Generate unique order reference with random suffix to prevent duplicates
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const orderReference = `DONATE-${project.id}-${timestamp}-${randomSuffix}`

    // Split donor name into first and last name
    const nameParts = validated.donor_name.trim().split(/\s+/)
    const clientFirstName = nameParts[0] || 'Donor'
    const clientLastName = nameParts.slice(1).join(' ') || 'Anonymous'

    // Determine language
    let language: 'UA' | 'EN' | 'RU' = 'UA'
    if (validated.locale === 'en') language = 'EN'
    else if (validated.locale === 'zh') language = 'EN' // Use EN for Chinese users
    else if (validated.locale === 'ua') language = 'UA'

    // Prepare return and callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    // Use API route to handle POST redirect from WayForPay, then redirect to success page
    const returnUrl = `${baseUrl}/api/donate/success-redirect?order=${orderReference}&locale=${validated.locale}`
    const serviceUrl = `${baseUrl}/api/webhooks/wayforpay`

    // Get localized project name for payment
    const projectName = getProjectName(
      project.project_name_i18n,
      project.project_name,
      validated.locale as SupportedLocale
    )

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
    const supabase = getPublicClient()
    const donationRecords = []

    // Main project donation records
    if (project.aggregate_donations) {
      // Aggregated mode: Create 1 record with total amount
      const { data: donationPublicId, error: idError } = await supabase.rpc(
        'generate_donation_public_id',
        { project_id_input: validated.project_id }
      )

      if (idError || !donationPublicId) {
        logger.error('DONATION', 'Failed to generate donation ID', { error: idError?.message })
        throw idError || new Error('Failed to generate donation ID')
      }

      donationRecords.push({
        donation_public_id: donationPublicId,
        order_reference: orderReference,
        project_id: validated.project_id,
        donor_name: validated.donor_name,
        donor_email: validated.donor_email,
        donor_message: validated.donor_message || null,
        contact_telegram: validated.contact_telegram || null,
        contact_whatsapp: validated.contact_whatsapp || null,
        amount: projectAmount, // Use project amount (excluding tip) for aggregated donations
        currency: 'USD',
        payment_method: 'WayForPay',
        donation_status: 'pending' as DonationStatus,
        locale: validated.locale,
      })
    } else {
      // Traditional mode: Create one record per unit
      for (let i = 0; i < validated.quantity; i++) {
        const { data: donationPublicId, error: idError } = await supabase.rpc(
          'generate_donation_public_id',
          { project_id_input: validated.project_id }
        )

        if (idError || !donationPublicId) {
          logger.error('DONATION', 'Failed to generate donation ID', { error: idError?.message })
          throw idError || new Error('Failed to generate donation ID')
        }

        donationRecords.push({
          donation_public_id: donationPublicId,
          order_reference: orderReference,
          project_id: validated.project_id,
          donor_name: validated.donor_name,
          donor_email: validated.donor_email,
          donor_message: validated.donor_message || null,
          contact_telegram: validated.contact_telegram || null,
          contact_whatsapp: validated.contact_whatsapp || null,
          amount: unitPrice, // Use unit price for traditional mode
          currency: 'USD',
          payment_method: 'WayForPay',
          donation_status: 'pending' as DonationStatus,
          locale: validated.locale,
        })
      }
    }

    // Tip donation for project 0 (if provided)
    if (validated.tip_amount && validated.tip_amount > 0) {
      const { data: tipDonationId, error: tipIdError } = await supabase.rpc(
        'generate_donation_public_id',
        { project_id_input: 0 } // Project 0 = Rehabilitation Center Support
      )

      if (tipIdError || !tipDonationId) {
        logger.error('DONATION', 'Failed to generate tip donation ID', { error: tipIdError?.message })
        throw tipIdError || new Error('Failed to generate tip donation ID')
      }

      donationRecords.push({
        donation_public_id: tipDonationId,
        order_reference: orderReference, // Same order reference for combined payment
        project_id: 0, // Project 0
        donor_name: validated.donor_name,
        donor_email: validated.donor_email,
        donor_message: validated.donor_message || null,
        contact_telegram: validated.contact_telegram || null,
        contact_whatsapp: validated.contact_whatsapp || null,
        amount: validated.tip_amount, // Tip amount (aggregated as single record)
        currency: 'USD',
        payment_method: 'WayForPay',
        donation_status: 'pending' as DonationStatus,
        locale: validated.locale,
      })
    }

    // Batch insert all pending donation records
    const { data: insertedData, error: dbError } = await supabase
      .from('donations')
      .insert(donationRecords)
      .select()

    if (dbError) {
      logger.error('DONATION', 'Failed to create pending donations', { error: dbError.message })
      throw new Error(`Failed to create pending donations: ${dbError.message}`)
    }

    if (!insertedData || insertedData.length === 0) {
      throw new Error('Failed to create pending donations: No data returned')
    }

    logger.info('DONATION', 'Pending records created', { count: insertedData.length, orderReference })

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

    const { data, error } = await supabase
      .from('donations')
      .update({ donation_status: 'widget_load_failed' })
      .eq('order_reference', orderReference)
      .eq('donation_status', 'pending')
      .select()

    if (error) {
      logger.error('DONATION', 'Failed to mark as widget_load_failed', {
        orderReference,
        error: error.message,
        code: error.code,
      })
      return { success: false, error: error.message }
    }

    if (!data || data.length === 0) {
      logger.debug('DONATION', 'No pending donations to mark as widget_load_failed', { orderReference })
      return { success: true }
    }

    logger.info('DONATION', 'Marked donations as widget_load_failed', {
      orderReference,
      count: data.length,
    })
    return { success: true }

  } catch (error) {
    logger.errorWithStack('DONATION', 'markDonationWidgetFailed failed', error, { orderReference })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Create NOWPayments cryptocurrency donation
 */
export async function createNowPaymentsDonation(data: {
  project_id: number
  quantity: number
  amount?: number // For aggregated projects: direct donation amount
  donor_name: string
  donor_email: string
  donor_message?: string
  contact_telegram?: string
  contact_whatsapp?: string
  tip_amount?: number
  locale: 'en' | 'zh' | 'ua'
  pay_currency: string // Cryptocurrency to pay with (e.g., 'usdttrc20', 'btc', 'eth')
}): Promise<NowPaymentsResult> {
  try {
    // Validate input
    const validated = donationFormSchema.parse(data)

    // Get all projects stats (includes the specific project we need)
    const allProjectsStats = await getProjectStats() as ProjectStats[]
    const project = allProjectsStats.find((p) => p.id === validated.project_id)

    if (!project) {
      return {
        success: false,
        error: 'project_not_found',
        allProjectsStats,
      }
    }

    if (project.status !== 'active') {
      return {
        success: false,
        error: 'project_not_active',
        allProjectsStats,
      }
    }

    // Get localized unit name for error messages
    const unitName = getUnitName(
      project.unit_name_i18n,
      project.unit_name,
      validated.locale as SupportedLocale
    )

    // Calculate project amount based on project type
    const unitPrice = project.unit_price ?? 0
    let projectAmount: number

    if (project.aggregate_donations) {
      if (!validated.amount || validated.amount <= 0) {
        return {
          success: false,
          error: 'server_error',
        }
      }
      projectAmount = validated.amount
    } else {
      projectAmount = unitPrice * validated.quantity
    }

    // Check limits for non-long-term projects
    if (!project.is_long_term) {
      if (project.aggregate_donations) {
        const targetAmount = project.target_units || 0
        const currentAmount = project.total_raised || 0
        const remainingAmount = targetAmount - currentAmount

        if (projectAmount > remainingAmount) {
          return {
            success: false,
            error: 'amount_limit_exceeded',
            maxQuantity: Math.floor(remainingAmount),
            unitName: 'USD',
            allProjectsStats,
          }
        }
      } else {
        const remainingUnits = (project.target_units || 0) - (project.current_units || 0)
        if (validated.quantity > remainingUnits) {
          return {
            success: false,
            error: 'quantity_exceeded',
            remainingUnits,
            unitName,
            allProjectsStats,
          }
        }
      }
    }

    const totalAmount = projectAmount + (validated.tip_amount || 0)

    // Note: Minimum amount check removed - let NOWPayments API handle it
    // The API will return specific error messages for amounts that are too small

    // Check total amount limit ($10,000 max)
    if (totalAmount > 10000) {
      if (project.aggregate_donations) {
        return {
          success: false,
          error: 'amount_limit_exceeded',
          maxQuantity: 10000,
          unitName: 'USD',
          allProjectsStats,
        }
      } else {
        const maxQuantity = Math.floor(10000 / unitPrice)
        return {
          success: false,
          error: 'amount_limit_exceeded',
          maxQuantity,
          unitName,
          allProjectsStats,
        }
      }
    }

    // Generate unique order reference
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const orderReference = `DONATE-${project.id}-${timestamp}-${randomSuffix}`

    // Get localized project name
    const projectName = getProjectName(
      project.project_name_i18n,
      project.project_name,
      validated.locale as SupportedLocale
    )

    // Create NOWPayments payment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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
    const supabase = getPublicClient()
    const donationRecords = []

    if (project.aggregate_donations) {
      const { data: donationPublicId, error: idError } = await supabase.rpc(
        'generate_donation_public_id',
        { project_id_input: validated.project_id }
      )

      if (idError || !donationPublicId) {
        logger.error('DONATION', 'Failed to generate donation ID', { error: idError?.message })
        throw idError || new Error('Failed to generate donation ID')
      }

      donationRecords.push({
        donation_public_id: donationPublicId,
        order_reference: orderReference,
        project_id: validated.project_id,
        donor_name: validated.donor_name,
        donor_email: validated.donor_email,
        donor_message: validated.donor_message || null,
        contact_telegram: validated.contact_telegram || null,
        contact_whatsapp: validated.contact_whatsapp || null,
        amount: projectAmount,
        currency: 'USD',
        payment_method: 'NOWPayments',
        donation_status: 'pending' as DonationStatus,
        locale: validated.locale,
      })
    } else {
      for (let i = 0; i < validated.quantity; i++) {
        const { data: donationPublicId, error: idError } = await supabase.rpc(
          'generate_donation_public_id',
          { project_id_input: validated.project_id }
        )

        if (idError || !donationPublicId) {
          logger.error('DONATION', 'Failed to generate donation ID', { error: idError?.message })
          throw idError || new Error('Failed to generate donation ID')
        }

        donationRecords.push({
          donation_public_id: donationPublicId,
          order_reference: orderReference,
          project_id: validated.project_id,
          donor_name: validated.donor_name,
          donor_email: validated.donor_email,
          donor_message: validated.donor_message || null,
          contact_telegram: validated.contact_telegram || null,
          contact_whatsapp: validated.contact_whatsapp || null,
          amount: unitPrice,
          currency: 'USD',
          payment_method: 'NOWPayments',
          donation_status: 'pending' as DonationStatus,
          locale: validated.locale,
        })
      }
    }

    // Tip donation for project 0 (if provided)
    if (validated.tip_amount && validated.tip_amount > 0) {
      const { data: tipDonationId, error: tipIdError } = await supabase.rpc(
        'generate_donation_public_id',
        { project_id_input: 0 }
      )

      if (tipIdError || !tipDonationId) {
        logger.error('DONATION', 'Failed to generate tip donation ID', { error: tipIdError?.message })
        throw tipIdError || new Error('Failed to generate tip donation ID')
      }

      donationRecords.push({
        donation_public_id: tipDonationId,
        order_reference: orderReference,
        project_id: 0,
        donor_name: validated.donor_name,
        donor_email: validated.donor_email,
        donor_message: validated.donor_message || null,
        contact_telegram: validated.contact_telegram || null,
        contact_whatsapp: validated.contact_whatsapp || null,
        amount: validated.tip_amount,
        currency: 'USD',
        payment_method: 'NOWPayments',
        donation_status: 'pending' as DonationStatus,
        locale: validated.locale,
      })
    }

    // Insert pending donation records
    const { data: insertedData, error: dbError } = await supabase
      .from('donations')
      .insert(donationRecords)
      .select()

    if (dbError) {
      logger.error('DONATION', 'Failed to create pending donations', { error: dbError.message })
      throw new Error(`Failed to create pending donations: ${dbError.message}`)
    }

    if (!insertedData || insertedData.length === 0) {
      throw new Error('Failed to create pending donations: No data returned')
    }

    logger.info('DONATION', 'Pending records created (NOWPayments)', { count: insertedData.length, orderReference })

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
      error: error instanceof Error ? error.message : 'Failed to fetch currencies'
    }
  }
}

/**
 * Get minimum payment amount in USD for a specific pay currency
 * Queries the real minimum based on crypto -> outcome wallet conversion
 */
export async function getNowPaymentsMinimum(
  payCurrency: string
): Promise<{
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
      error: error instanceof Error ? error.message : 'Failed to fetch minimum amount'
    }
  }
}
