/**
 * Unsubscribe API Route
 * Handles email unsubscribe requests from email links and JSON requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { unsubscribeSchema } from '@/lib/validations'

// ==================== GET Handler (Email Links) ====================

/**
 * Handle unsubscribe from email links
 * URL format: /api/unsubscribe?email=user@example.com&locale=en
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')
    const locale = searchParams.get('locale') || 'en'

    // Validate parameters
    const validated = unsubscribeSchema.parse({ email, locale })

    const supabase = await createServerClient()

    // Call database function to unsubscribe
    const { error } = await supabase.rpc('unsubscribe_email', {
      p_email: validated.email
    })

    if (error) {
      logger.error('SUBSCRIPTION', 'Unsubscribe failed', { error: error.message })
      // Redirect to error page
      return NextResponse.redirect(
        new URL(`/${locale}/unsubscribed?error=true`, request.url)
      )
    }

    // Redirect to unsubscribed page
    return NextResponse.redirect(new URL(`/${locale}/unsubscribed`, request.url))
  } catch (error) {
    logger.errorWithStack('SUBSCRIPTION', 'Unsubscribe GET error', error)
    const locale = request.nextUrl.searchParams.get('locale') || 'en'
    return NextResponse.redirect(
      new URL(`/${locale}/unsubscribed?error=true`, request.url)
    )
  }
}

// ==================== POST Handler (JSON Requests) ====================

/**
 * Handle unsubscribe from JSON requests
 * Body: { email: string, locale?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate body
    const validated = unsubscribeSchema.parse(body)

    const supabase = await createServerClient()

    // Call database function to unsubscribe
    const { error } = await supabase.rpc('unsubscribe_email', {
      p_email: validated.email
    })

    if (error) {
      logger.error('SUBSCRIPTION', 'Unsubscribe failed', { error: error.message })
      return NextResponse.json(
        { success: false, error: 'Failed to unsubscribe' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      )
    }

    logger.errorWithStack('SUBSCRIPTION', 'Unsubscribe POST error', error)
    return NextResponse.json(
      { success: false, error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
