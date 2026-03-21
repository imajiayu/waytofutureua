import { NextResponse } from 'next/server'
import { verifyNowPaymentsSignature, NOWPAYMENTS_STATUS } from '@/lib/payment/nowpayments/server'
import type { NowPaymentsWebhookBody } from '@/lib/payment/nowpayments/types'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPaymentSuccessEmail, sendRefundSuccessEmail } from '@/lib/email'
import {
  PAYMENT_WEBHOOK_SOURCE_STATUSES,
  REFUND_WEBHOOK_SOURCE_STATUSES,
  type DonationStatus,
} from '@/lib/donation-status'
import { logger } from '@/lib/logger'
import type { SupportedLocale } from '@/lib/i18n-utils'

/**
 * NOWPayments Webhook Handler (IPN - Instant Payment Notification)
 *
 * Receives payment status notifications from NOWPayments and updates donation records.
 *
 * Status Mapping (from docs/NOWPAYMENTS_INTEGRATION.md):
 * - waiting      → pending (no update needed)
 * - confirming   → processing
 * - confirmed    → processing
 * - sending      → processing
 * - finished     → paid (send email)
 * - partially_paid → failed (requires manual refund)
 * - failed       → failed
 * - expired      → expired
 * - refunded     → refunded (send email)
 * - wrong_asset_confirmed → failed
 * - cancelled    → failed
 *
 * @see https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NowPaymentsWebhookBody
    const signature = req.headers.get('x-nowpayments-sig') || ''

    const paymentStatus = body.payment_status
    const orderId = body.order_id

    logger.info('WEBHOOK:NOWPAYMENTS', 'Webhook received', {
      status: paymentStatus,
      orderId,
      paymentId: body.payment_id,
      actuallyPaid: body.actually_paid,
      payCurrency: body.pay_currency,
    })

    // Verify signature
    if (!signature || !verifyNowPaymentsSignature(body, signature)) {
      logger.error('WEBHOOK:NOWPAYMENTS', 'Invalid signature', { orderId })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Query all donations with this order_reference
    const { data: donations, error: fetchError } = await supabase
      .from('donations')
      .select('donation_status, payment_method')
      .eq('order_reference', orderId)

    if (fetchError) {
      logger.error('WEBHOOK:NOWPAYMENTS', 'Database query failed', {
        orderId,
        error: fetchError.message,
      })
      throw fetchError
    }

    // Case 1: No donations found
    if (!donations || donations.length === 0) {
      logger.warn('WEBHOOK:NOWPAYMENTS', 'Order not found', { orderId })
      return NextResponse.json({ status: 'ok', message: 'Order not found' })
    }

    // Verify this is a NOWPayments donation
    const isNowPaymentsDonation = donations.some((d) => d.payment_method === 'NOWPayments')
    if (!isNowPaymentsDonation) {
      logger.warn('WEBHOOK:NOWPAYMENTS', 'Not a NOWPayments order', { orderId })
      return NextResponse.json({ status: 'ok', message: 'Not a NOWPayments order' })
    }

    // Map NOWPayments status to our donation status
    let newStatus: DonationStatus | null = null
    let shouldSendEmail = false

    switch (paymentStatus) {
      case NOWPAYMENTS_STATUS.WAITING:
        logger.debug('WEBHOOK:NOWPAYMENTS', 'Waiting for crypto payment', { orderId })
        return NextResponse.json({ status: 'ok' })

      case NOWPAYMENTS_STATUS.CONFIRMING:
      case NOWPAYMENTS_STATUS.CONFIRMED:
      case NOWPAYMENTS_STATUS.SENDING:
        newStatus = 'processing'
        logger.info('WEBHOOK:NOWPAYMENTS', 'Payment in progress', {
          orderId,
          status: paymentStatus,
        })
        break

      case NOWPAYMENTS_STATUS.FINISHED:
        newStatus = 'paid'
        shouldSendEmail = true
        logger.info('WEBHOOK:NOWPAYMENTS', 'Payment finished', { orderId })
        break

      case NOWPAYMENTS_STATUS.PARTIALLY_PAID:
        newStatus = 'paid'
        shouldSendEmail = true
        logger.warn('WEBHOOK:NOWPAYMENTS', 'Partial payment - requires reconciliation', {
          orderId,
          expected: body.pay_amount,
          received: body.actually_paid,
          currency: body.pay_currency,
        })
        break

      case NOWPAYMENTS_STATUS.FAILED:
        newStatus = 'failed'
        logger.info('WEBHOOK:NOWPAYMENTS', 'Payment failed', { orderId })
        break

      case NOWPAYMENTS_STATUS.EXPIRED:
        newStatus = 'expired'
        logger.info('WEBHOOK:NOWPAYMENTS', 'Payment expired', { orderId })
        break

      case NOWPAYMENTS_STATUS.REFUNDED:
        newStatus = 'refunded'
        shouldSendEmail = true
        logger.info('WEBHOOK:NOWPAYMENTS', 'Payment refunded', { orderId })
        break

      case NOWPAYMENTS_STATUS.WRONG_ASSET_CONFIRMED:
        newStatus = 'failed'
        logger.warn('WEBHOOK:NOWPAYMENTS', 'Wrong asset/network used', { orderId })
        break

      case NOWPAYMENTS_STATUS.CANCELLED:
        newStatus = 'failed'
        logger.info('WEBHOOK:NOWPAYMENTS', 'Payment cancelled', { orderId })
        break

      default:
        logger.warn('WEBHOOK:NOWPAYMENTS', 'Unknown status', { orderId, status: paymentStatus })
        return NextResponse.json({ status: 'ok', message: 'Unknown status' })
    }

    // Determine which statuses can be updated
    const isRefund = paymentStatus === NOWPAYMENTS_STATUS.REFUNDED
    const transitionableStatuses: readonly DonationStatus[] = isRefund
      ? REFUND_WEBHOOK_SOURCE_STATUSES
      : PAYMENT_WEBHOOK_SOURCE_STATUSES

    // Check if any donations are in a transitionable state
    const updatableDonations = donations.filter((d) =>
      transitionableStatuses.includes(d.donation_status as DonationStatus)
    )

    if (updatableDonations.length === 0) {
      logger.debug('WEBHOOK:NOWPAYMENTS', 'No donations in transitionable state', {
        orderId,
        currentStatuses: donations.map((d) => d.donation_status),
      })
      return NextResponse.json({ status: 'ok' })
    }

    // Update donations to new status
    if (newStatus) {
      const { data: updatedDonations, error: updateError } = await supabase
        .from('donations')
        .update({ donation_status: newStatus })
        .eq('order_reference', orderId)
        .in('donation_status', transitionableStatuses)
        .select('project_id, donation_public_id, donor_email, donor_name, locale, amount')

      if (updateError) {
        logger.error('WEBHOOK:NOWPAYMENTS', 'Update failed', {
          orderId,
          error: updateError.message,
        })
        return NextResponse.json({ status: 'ok', message: 'Update failed' })
      }

      logger.info('WEBHOOK:NOWPAYMENTS', 'Donations updated', {
        orderId,
        count: updatedDonations?.length || 0,
        toStatus: newStatus,
      })

      // Send confirmation email for successful payments
      if (shouldSendEmail && updatedDonations && updatedDonations.length > 0) {
        try {
          const firstDonation = updatedDonations[0]
          const projectIds = [...new Set(updatedDonations.map((d) => d.project_id))]

          const { data: projects } = await supabase
            .from('projects')
            .select('id, project_name_i18n, location_i18n, unit_name_i18n, aggregate_donations')
            .in('id', projectIds)

          if (projects && projects.length > 0) {
            const projectMap = new Map(projects.map((p) => [p.id, p]))

            if (newStatus === 'paid') {
              const donationItems = updatedDonations.map((donation) => {
                const project = projectMap.get(donation.project_id)
                return {
                  donationPublicId: donation.donation_public_id,
                  projectNameI18n: (project?.project_name_i18n || { en: '', zh: '', ua: '' }) as {
                    en: string
                    zh: string
                    ua: string
                  },
                  locationI18n: (project?.location_i18n || { en: '', zh: '', ua: '' }) as {
                    en: string
                    zh: string
                    ua: string
                  },
                  unitNameI18n: (project?.unit_name_i18n || { en: '', zh: '', ua: '' }) as {
                    en: string
                    zh: string
                    ua: string
                  },
                  amount: Number(donation.amount),
                  isAggregate: project?.aggregate_donations === true,
                }
              })

              const totalAmount = updatedDonations.reduce((sum, d) => sum + Number(d.amount), 0)

              await sendPaymentSuccessEmail({
                to: firstDonation.donor_email,
                donorName: firstDonation.donor_name,
                donations: donationItems,
                totalAmount,
                currency: 'USD',
                locale: firstDonation.locale as SupportedLocale,
              })

              logger.info('WEBHOOK:NOWPAYMENTS', 'Confirmation email sent', {
                orderId,
                to: firstDonation.donor_email,
              })
            } else if (newStatus === 'refunded') {
              const project = projectMap.get(firstDonation.project_id)
              const refundAmount = updatedDonations.reduce((sum, d) => sum + Number(d.amount), 0)

              await sendRefundSuccessEmail({
                to: firstDonation.donor_email,
                donorName: firstDonation.donor_name,
                projectNameI18n: (project?.project_name_i18n || { en: '', zh: '', ua: '' }) as {
                  en: string
                  zh: string
                  ua: string
                },
                donationIds: updatedDonations.map((d) => d.donation_public_id),
                refundAmount,
                currency: 'USD',
                locale: firstDonation.locale as SupportedLocale,
              })

              logger.info('WEBHOOK:NOWPAYMENTS', 'Refund email sent', {
                orderId,
                to: firstDonation.donor_email,
              })
            }
          }
        } catch (emailError) {
          logger.error('WEBHOOK:NOWPAYMENTS', 'Email send failed', {
            orderId,
            error: emailError instanceof Error ? emailError.message : String(emailError),
          })
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    logger.errorWithStack('WEBHOOK:NOWPAYMENTS', 'Unexpected error', error)
    return NextResponse.json({ status: 'error', message: 'Internal error' })
  }
}
