import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { createAnonClient } from '@/lib/supabase/server'
import type { OrderDonationsSecureRow } from '@/types/dtos'

// Disable Next.js caching for this API route
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Secure Public API for Order Donations Query
 *
 * Security Improvements:
 * - Uses anonymous client (RLS enforced)
 * - Queries secure view (order_donations_secure)
 * - Email is obfuscated (j***e@e***.com)
 * - Donor name excluded for privacy
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ orderReference: string }> }
) {
  const params = await props.params
  const { orderReference } = params

  if (!orderReference) {
    return NextResponse.json({ error: 'Order reference is required' }, { status: 400 })
  }

  try {
    // SECURITY: Use anonymous client - RLS enforced via secure view
    const supabase = createAnonClient()

    // Query secure view instead of raw donations table
    // This view obfuscates email and excludes donor_name
    const { data: donations, error } = await supabase
      .from('order_donations_secure')
      .select('*')
      .eq('order_reference', orderReference)
      .order('id', { ascending: true })

    if (error) {
      logger.error('API', 'Error fetching order donations', {
        orderReference,
        error: error.message,
      })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    // Transform the view data to match expected frontend format
    const transformedDonations = ((donations || []) as OrderDonationsSecureRow[]).map((d) => ({
      id: d.id,
      donation_public_id: d.donation_public_id,
      amount: d.amount,
      donor_email: d.donor_email_obfuscated, // Use obfuscated email
      donation_status: d.donation_status,
      projects: {
        id: d.project_id,
        project_name_i18n: d.project_name_i18n,
        location_i18n: d.location_i18n,
        unit_name_i18n: d.unit_name_i18n,
        aggregate_donations: d.aggregate_donations, // NEW: For proper display logic
      },
    }))

    return NextResponse.json(
      { donations: transformedDonations },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    )
  } catch (error) {
    logger.errorWithStack('API', 'Unexpected error in order donations', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
