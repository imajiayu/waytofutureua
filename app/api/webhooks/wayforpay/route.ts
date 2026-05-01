import { NextResponse } from 'next/server'

import {
  type DonationStatus,
  getWebhookSourceStatuses,
  isRefundWebhook,
  REFUND_DECLINED_CHECK_STATUSES,
} from '@/lib/donation-status'
import { sendPaymentSuccessEmail, sendRefundSuccessEmail } from '@/lib/email'
import {
  buildPaymentSuccessPayload,
  buildRefundSuccessPayload,
} from '@/lib/email/build-webhook-payload'
import { logger } from '@/lib/logger'
import { verifyWayForPaySignature, WAYFORPAY_STATUS } from '@/lib/payment/wayforpay/server'
import { respondWithAccept } from '@/lib/payment/wayforpay/webhook-response'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * WayForPay Webhook Handler
 *
 * Receives payment status notifications from WayForPay and updates donation records.
 * Implements enhanced status handling from docs/PAYMENT_WORKFLOW.md
 *
 * @see https://wiki.wayforpay.com/en/view/852102
 * @see docs/PAYMENT_WORKFLOW.md
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const transactionStatus = body.transactionStatus
    const orderReference = body.orderReference

    logger.info('WEBHOOK:WAYFORPAY', 'Webhook received', {
      status: transactionStatus,
      orderReference,
    })

    // Verify signature
    if (!body.merchantSignature || !verifyWayForPaySignature(body, body.merchantSignature)) {
      logger.error('WEBHOOK:WAYFORPAY', 'Invalid signature', { orderReference })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Query all donations with this order_reference
    const { data: donations, error: fetchError } = await supabase
      .from('donations')
      .select('donation_status')
      .eq('order_reference', orderReference)

    if (fetchError) {
      logger.error('WEBHOOK:WAYFORPAY', 'Database query failed', {
        orderReference,
        error: fetchError.message,
      })
      throw fetchError
    }

    // Case 1: No donations found
    if (!donations || donations.length === 0) {
      logger.warn('WEBHOOK:WAYFORPAY', 'Order not found', { orderReference })
      return respondWithAccept(orderReference)
    }

    // Map WayForPay status to our donation status
    let newStatus: DonationStatus | null = null
    let shouldSendEmail = false

    switch (transactionStatus) {
      case WAYFORPAY_STATUS.APPROVED:
        newStatus = 'paid'
        shouldSendEmail = true
        logger.info('WEBHOOK:WAYFORPAY', 'Payment approved', { orderReference })
        break

      case WAYFORPAY_STATUS.PENDING:
        newStatus = 'fraud_check'
        logger.info('WEBHOOK:WAYFORPAY', 'Under anti-fraud verification', { orderReference })
        break

      case WAYFORPAY_STATUS.IN_PROCESSING:
        newStatus = 'processing'
        logger.info('WEBHOOK:WAYFORPAY', 'Processing by gateway', { orderReference })
        break

      case WAYFORPAY_STATUS.WAITING_AUTH_COMPLETE:
        newStatus = 'paid'
        shouldSendEmail = true
        logger.info('WEBHOOK:WAYFORPAY', 'Pre-authorization successful', { orderReference })
        break

      case WAYFORPAY_STATUS.DECLINED:
        // CRITICAL: Distinguish between payment declined and refund declined
        const currentStatuses = donations.map((d) => d.donation_status as DonationStatus)
        const isRefundDeclined = currentStatuses.some((s) =>
          REFUND_DECLINED_CHECK_STATUSES.includes(s)
        )

        if (isRefundDeclined) {
          logger.info('WEBHOOK:WAYFORPAY', 'Refund declined - keeping original status', {
            orderReference,
          })
          return respondWithAccept(orderReference)
        } else {
          newStatus = 'declined'
          logger.info('WEBHOOK:WAYFORPAY', 'Payment declined by bank', { orderReference })
        }
        break

      case WAYFORPAY_STATUS.EXPIRED:
        newStatus = 'expired'
        logger.info('WEBHOOK:WAYFORPAY', 'Payment expired', { orderReference })
        break

      case WAYFORPAY_STATUS.REFUNDED:
      case WAYFORPAY_STATUS.VOIDED:
        newStatus = 'refunded'
        logger.info('WEBHOOK:WAYFORPAY', 'Funds returned', {
          orderReference,
          type: transactionStatus,
        })
        break

      case WAYFORPAY_STATUS.REFUND_IN_PROCESSING:
        newStatus = 'refund_processing'
        logger.info('WEBHOOK:WAYFORPAY', 'Refund processing', { orderReference })
        break

      default:
        newStatus = 'failed'
        logger.warn('WEBHOOK:WAYFORPAY', 'Unknown status - marking as failed', {
          orderReference,
          status: transactionStatus,
        })
    }

    // Determine which statuses can be updated based on webhook type
    const isRefund = isRefundWebhook(transactionStatus)
    const transitionableStatuses = getWebhookSourceStatuses(isRefund)

    // Check if any donations are in a transitionable state
    const updatableDonations = donations.filter((d) =>
      transitionableStatuses.includes(d.donation_status as DonationStatus)
    )

    if (updatableDonations.length === 0) {
      logger.debug('WEBHOOK:WAYFORPAY', 'No donations in transitionable state', {
        orderReference,
        currentStatuses: donations.map((d) => d.donation_status),
      })
      return respondWithAccept(orderReference)
    }

    // Update donations to new status
    if (newStatus) {
      const { data: updatedDonations, error: updateError } = await supabase
        .from('donations')
        .update({ donation_status: newStatus })
        .eq('order_reference', orderReference)
        .in('donation_status', transitionableStatuses)
        .select('project_id, donation_public_id, donor_email, donor_name, locale, amount')

      if (updateError) {
        logger.error('WEBHOOK:WAYFORPAY', 'Update failed - manual intervention required', {
          orderReference,
          error: updateError.message,
          details: updateError.details,
        })
        return respondWithAccept(orderReference)
      }

      logger.info('WEBHOOK:WAYFORPAY', 'Donations updated', {
        orderReference,
        count: updatedDonations?.length || 0,
        fromStatuses: updatableDonations.map((d) => d.donation_status),
        toStatus: newStatus,
      })

      // Send confirmation email for successful payments
      if (shouldSendEmail && updatedDonations && updatedDonations.length > 0) {
        try {
          const payload = await buildPaymentSuccessPayload(
            supabase,
            updatedDonations,
            body.currency
          )
          if (payload) {
            await sendPaymentSuccessEmail(payload)
            logger.info('WEBHOOK:WAYFORPAY', 'Confirmation email sent', {
              orderReference,
              to: payload.to,
            })
          }
        } catch (emailError) {
          logger.error('WEBHOOK:WAYFORPAY', 'Email send failed', {
            orderReference,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          })
        }
      }

      // Send refund success email when status becomes refunded
      if (newStatus === 'refunded' && updatedDonations && updatedDonations.length > 0) {
        try {
          const payload = await buildRefundSuccessPayload(
            supabase,
            updatedDonations,
            body.currency || 'USD',
            body.reason || undefined
          )
          if (payload) {
            await sendRefundSuccessEmail(payload)
            logger.info('WEBHOOK:WAYFORPAY', 'Refund email sent', {
              orderReference,
              to: payload.to,
            })
          }
        } catch (emailError) {
          logger.error('WEBHOOK:WAYFORPAY', 'Refund email send failed', {
            orderReference,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          })
        }
      }
    }

    return respondWithAccept(orderReference)
  } catch (error) {
    logger.errorWithStack('WEBHOOK:WAYFORPAY', 'Unexpected error', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
