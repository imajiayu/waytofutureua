import { after, NextRequest, NextResponse } from 'next/server'

import {
  type DonationStatus,
  PAYMENT_WEBHOOK_SOURCE_STATUSES,
} from '@/lib/donation-status'
import { sendPaymentSuccessEmail } from '@/lib/email'
import {
  buildPaymentSuccessPayload,
} from '@/lib/email/build-webhook-payload'
import { logger } from '@/lib/logger'
import { verifyEPaySignature } from '@/lib/payment/epay/crypto'
import type { EPayWebhookParams } from '@/lib/payment/epay/types'
import { isEPayDonation } from '@/lib/payment-method'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * EPay (易支付) Payment Webhook Handler
 *
 * Key differences from WayForPay/NOWPayments:
 *  - the platform sends a GET request (not POST)
 *  - Must return plain text "success" (not JSON)
 *  - Signature uses RSA SHA256WithRSA (not HMAC)
 *  - Only fires for TRADE_SUCCESS; no separate failure/expiry notifications
 *
 * Idempotency: returning "success" on every code path (including signature
 * failure) prevents infinite retry loops from the platform. DB is only
 * updated when the signature is valid and the status is TRADE_SUCCESS.
 */
export async function GET(request: NextRequest) {
  const rawParams: Record<string, string> = {}
  request.nextUrl.searchParams.forEach((value, key) => {
    rawParams[key] = value
  })

  const params = rawParams as unknown as Partial<EPayWebhookParams>
  const orderReference = params.out_trade_no
  const tradeStatus = params.trade_status
  const receivedSign = params.sign

  logger.info('WEBHOOK:EPAY', 'Webhook received', {
    orderReference,
    tradeStatus,
    tradeNo: params.trade_no,
    money: params.money,
  })

  // Verify RSA signature
  // Remove sign from the params copy before building the sign string
  const paramsForVerify = { ...rawParams }
  delete paramsForVerify.sign

  if (!receivedSign || !verifyEPaySignature(paramsForVerify, receivedSign)) {
    logger.error('WEBHOOK:EPAY', 'Invalid signature', { orderReference })
    // Return success to prevent infinite retries; do NOT update DB
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Only TRADE_SUCCESS triggers a status update
  if (tradeStatus !== 'TRADE_SUCCESS') {
    logger.info('WEBHOOK:EPAY', 'Non-success status, ignoring', {
      orderReference,
      tradeStatus,
    })
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  if (!orderReference) {
    logger.error('WEBHOOK:EPAY', 'Missing out_trade_no')
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const supabase = createServiceClient()

  // Query donations by orderReference
  const { data: donations, error: fetchError } = await supabase
    .from('donations')
    .select('donation_status, payment_method')
    .eq('order_reference', orderReference)

  if (fetchError) {
    logger.error('WEBHOOK:EPAY', 'Database query failed', {
      orderReference,
      error: fetchError.message,
    })
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  if (!donations || donations.length === 0) {
    logger.warn('WEBHOOK:EPAY', 'Order not found', { orderReference })
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Verify this order belongs to an EPay gateway. Matching the whole provider
  // family (not just the active instance) is safe because the signature check
  // above already proves the callback came from the platform we hold keys for.
  const isEPayOrder = donations.some((d) => isEPayDonation(d.payment_method))
  if (!isEPayOrder) {
    logger.warn('WEBHOOK:EPAY', 'Not an EPay order', { orderReference })
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Filter to donations that can transition to 'paid'
  const updatableDonations = donations.filter((d) =>
    PAYMENT_WEBHOOK_SOURCE_STATUSES.includes(d.donation_status as DonationStatus)
  )

  if (updatableDonations.length === 0) {
    logger.debug('WEBHOOK:EPAY', 'No donations in transitionable state', {
      orderReference,
      currentStatuses: donations.map((d) => d.donation_status),
    })
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Update donation status to 'paid'
  const { data: updatedDonations, error: updateError } = await supabase
    .from('donations')
    .update({ donation_status: 'paid', updated_at: new Date().toISOString() })
    .eq('order_reference', orderReference)
    .in('donation_status', PAYMENT_WEBHOOK_SOURCE_STATUSES)
    .select('project_id, donation_public_id, donor_email, donor_name, locale, amount')

  if (updateError) {
    logger.error('WEBHOOK:EPAY', 'Status update failed', {
      orderReference,
      error: updateError.message,
    })
    return new NextResponse('success', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  logger.info('WEBHOOK:EPAY', 'Donations updated to paid', {
    orderReference,
    count: updatedDonations?.length ?? 0,
  })

  // Send payment confirmation email (non-blocking, after response)
  if (updatedDonations && updatedDonations.length > 0) {
    after(async () => {
      try {
        // Use 'CNY' as currency since the platform settles in RMB
        const payload = await buildPaymentSuccessPayload(supabase, updatedDonations, 'CNY')
        if (payload) {
          await sendPaymentSuccessEmail(payload)
          logger.info('WEBHOOK:EPAY', 'Confirmation email sent', {
            orderReference,
            to: payload.to,
          })
        }
      } catch (emailError) {
        logger.error('WEBHOOK:EPAY', 'Email send failed', {
          orderReference,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        })
      }
    })
  }

  // Must return plain text "success" — not JSON
  return new NextResponse('success', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  })
}
