import { getProjectName, getUnitName } from '@/lib/i18n-utils'
import { logger } from '@/lib/logger'
import { getPublicClient } from '@/lib/supabase/action-clients'
import { getProjectStats } from '@/lib/supabase/queries'
import { donationFormSchema } from '@/lib/validations'
import type { AppLocale, DonationStatus, ProjectStats } from '@/types'

/**
 * Shared infrastructure for donation creation Server Actions.
 *
 * Both `createWayForPayDonation` and `createNowPaymentsDonation` share the
 * same pre-payment pipeline: validation → project lookup → amount calculation
 * → limit checks → orderReference generation → DB pending records insert.
 * The only divergence is which payment provider is invoked between
 * "context prepared" and "records inserted" — that lives in the caller.
 *
 * Hard requirements (preserved verbatim from the inline implementations):
 *   - error code strings are part of the public Server Action contract; do not rename
 *   - orderReference format `DONATE-${project.id}-${timestamp}-${randomSuffix}` is byte-equal
 *   - donation row field set + values are byte-equal per provider
 *   - `generate_donation_public_id` RPC is called once per row (aggregated=1, units=quantity, +1 for tip)
 *   - the $10,000 transaction cap is the only place this limit is enforced
 */

// ============================================================
// Input / Output types
// ============================================================

export interface DonationCreationInput {
  project_id: number
  quantity: number
  amount?: number
  donor_name: string
  donor_email: string
  donor_message?: string
  contact_telegram?: string
  contact_whatsapp?: string
  tip_amount?: number
  locale: 'en' | 'zh' | 'ua'
}

export interface DonationCreationContext {
  /** zod-validated input */
  validated: ReturnType<typeof donationFormSchema.parse>
  project: ProjectStats
  unitPrice: number
  /** project portion only (no tip) */
  projectAmount: number
  /** project + tip */
  totalAmount: number
  /** localized unit name (used in error messages and metadata) */
  unitName: string
  /** localized project name (used in payment params + metadata) */
  projectName: string
  orderReference: string
  allProjectsStats: ProjectStats[]
}

export type DonationCreationError =
  | {
      error: 'quantity_exceeded'
      remainingUnits: number
      unitName: string
      allProjectsStats: ProjectStats[]
    }
  | {
      error: 'amount_limit_exceeded'
      maxQuantity: number
      unitName: string
      allProjectsStats: ProjectStats[]
    }
  | { error: 'project_not_found'; allProjectsStats: ProjectStats[] }
  | { error: 'project_not_active'; allProjectsStats: ProjectStats[] }
  | { error: 'server_error' }

// ============================================================
// Error factories (V2-F-5: previously inline in donation.ts)
// ============================================================

export function createQuantityExceededError(
  remainingUnits: number,
  unitName: string,
  allProjectsStats: ProjectStats[]
): DonationCreationError {
  return {
    error: 'quantity_exceeded',
    remainingUnits,
    unitName,
    allProjectsStats,
  }
}

export function createAmountLimitExceededError(
  maxQuantity: number,
  unitName: string,
  allProjectsStats: ProjectStats[]
): DonationCreationError {
  return {
    error: 'amount_limit_exceeded',
    maxQuantity,
    unitName,
    allProjectsStats,
  }
}

// ============================================================
// Pre-payment pipeline
// ============================================================

/**
 * Run validation + project checks + amount calculation + limit enforcement,
 * generate the orderReference, and resolve localized strings.
 *
 * Mirrors the verbatim block previously inlined at the top of both
 * createWayForPayDonation and createNowPaymentsDonation.
 */
export async function prepareDonationContext(
  input: DonationCreationInput
): Promise<{ ok: true; ctx: DonationCreationContext } | { ok: false; err: DonationCreationError }> {
  // Validate input
  const validated = donationFormSchema.parse(input)

  // Get all projects stats (includes the specific project we need)
  const allProjectsStats = (await getProjectStats()) as ProjectStats[]
  const project = allProjectsStats.find((p) => p.id === validated.project_id)

  if (!project) {
    return { ok: false, err: { error: 'project_not_found', allProjectsStats } }
  }

  if (project.status !== 'active') {
    return { ok: false, err: { error: 'project_not_active', allProjectsStats } }
  }

  // Get localized unit name for error messages
  const unitName = getUnitName(
    project.unit_name_i18n,
    project.unit_name,
    validated.locale as AppLocale
  )

  // Calculate project amount based on project type
  const unitPrice = project.unit_price ?? 0
  let projectAmount: number

  if (project.aggregate_donations) {
    // Aggregated projects: Use the amount passed from frontend
    if (!validated.amount || validated.amount <= 0) {
      return { ok: false, err: { error: 'server_error' } }
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
        return {
          ok: false,
          err: createAmountLimitExceededError(
            Math.floor(remainingAmount), // Use maxQuantity to pass remaining amount
            'USD', // For aggregated projects, unit is currency
            allProjectsStats
          ),
        }
      }
    } else {
      // For non-aggregated projects: check quantity limits
      const remainingUnits = (project.target_units || 0) - (project.current_units || 0)
      if (validated.quantity > remainingUnits) {
        return {
          ok: false,
          err: createQuantityExceededError(remainingUnits, unitName, allProjectsStats),
        }
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
      return { ok: false, err: createAmountLimitExceededError(10000, 'USD', allProjectsStats) }
    } else {
      // Non-aggregated: calculate max units based on unit price
      const maxQuantity = Math.floor(10000 / unitPrice)
      return {
        ok: false,
        err: createAmountLimitExceededError(maxQuantity, unitName, allProjectsStats),
      }
    }
  }

  // Generate unique order reference with random suffix to prevent duplicates
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
  const orderReference = `DONATE-${project.id}-${timestamp}-${randomSuffix}`

  // Get localized project name (used by payment params + metadata)
  const projectName = getProjectName(
    project.project_name_i18n,
    project.project_name,
    validated.locale as AppLocale
  )

  return {
    ok: true,
    ctx: {
      validated,
      project,
      unitPrice,
      projectAmount,
      totalAmount,
      unitName,
      projectName,
      orderReference,
      allProjectsStats,
    },
  }
}

// ============================================================
// DB writes
// ============================================================

type PaymentMethodLabel = 'WayForPay' | 'NOWPayments'

/**
 * Insert pending donation rows for the given context, mirroring the verbatim
 * insert block previously inlined in both donation creation actions.
 *
 * Row counts:
 *   - aggregated:        1 row at projectAmount
 *   - non-aggregated:    one row per unit at unitPrice
 *   - + 1 row for tip   when tip_amount > 0  (always project_id=0)
 */
export async function insertPendingDonations(
  ctx: DonationCreationContext,
  paymentMethod: PaymentMethodLabel
): Promise<void> {
  const { validated, project, unitPrice, projectAmount, orderReference } = ctx
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
      payment_method: paymentMethod,
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
        payment_method: paymentMethod,
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
      logger.error('DONATION', 'Failed to generate tip donation ID', {
        error: tipIdError?.message,
      })
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
      payment_method: paymentMethod,
      donation_status: 'pending' as DonationStatus,
      locale: validated.locale,
    })
  }

  // Batch insert all pending donation records
  const { error: dbError } = await supabase.from('donations').insert(donationRecords)

  if (dbError) {
    logger.error('DONATION', 'Failed to create pending donations', { error: dbError.message })
    throw new Error(`Failed to create pending donations: ${dbError.message}`)
  }

  // Log message intentionally tracks the previous per-action wording
  // (WayForPay path used "Pending records created"; NowPayments used
  // "Pending records created (NOWPayments)") so log output stays
  // identical to pre-refactor.
  const logSuffix = paymentMethod === 'NOWPayments' ? ' (NOWPayments)' : ''
  logger.info('DONATION', `Pending records created${logSuffix}`, {
    count: donationRecords.length,
    orderReference,
  })
}
