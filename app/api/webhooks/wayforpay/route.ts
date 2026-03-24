import { NextResponse } from 'next/server'
import {
  verifyWayForPaySignature,
  generateWebhookResponseSignature,
  WAYFORPAY_STATUS,
} from '@/lib/payment/wayforpay/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPaymentSuccessEmail, sendRefundSuccessEmail } from '@/lib/email'
import {
  isRefundWebhook,
  getWebhookSourceStatuses,
  REFUND_DECLINED_CHECK_STATUSES,
  type DonationStatus,
} from '@/lib/donation-status'
import { logger } from '@/lib/logger'
import type { SupportedLocale } from '@/lib/i18n-utils'

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
          const firstDonation = updatedDonations[0]
          const projectIds = [...new Set(updatedDonations.map((d) => d.project_id))]

          const { data: projects } = await supabase
            .from('projects')
            .select('id, project_name_i18n, location_i18n, unit_name_i18n, aggregate_donations')
            .in('id', projectIds)

          if (projects && projects.length > 0) {
            const projectMap = new Map(projects.map((p) => [p.id, p]))

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

            await sendPaymentSuccessEmail({
              to: firstDonation.donor_email,
              donorName: firstDonation.donor_name,
              donations: donationItems,
              totalAmount: updatedDonations.reduce((sum, d) => sum + Number(d.amount), 0),
              currency: body.currency,
              locale: firstDonation.locale as SupportedLocale,
            })

            logger.info('WEBHOOK:WAYFORPAY', 'Confirmation email sent', {
              orderReference,
              to: firstDonation.donor_email,
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
          const firstDonation = updatedDonations[0]
          const { data: project } = await supabase
            .from('projects')
            .select('project_name_i18n')
            .eq('id', firstDonation.project_id)
            .single()

          if (project) {
            const refundAmount = updatedDonations.reduce((sum, d) => sum + Number(d.amount), 0)

            await sendRefundSuccessEmail({
              to: firstDonation.donor_email,
              donorName: firstDonation.donor_name,
              projectNameI18n: project.project_name_i18n as { en: string; zh: string; ua: string },
              donationIds: updatedDonations.map((d) => d.donation_public_id),
              refundAmount,
              currency: body.currency || 'USD',
              locale: firstDonation.locale as SupportedLocale,
              refundReason: body.reason || undefined,
            })

            logger.info('WEBHOOK:WAYFORPAY', 'Refund email sent', {
              orderReference,
              to: firstDonation.donor_email,
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

/**
 * Helper function to generate accept response for WayForPay
 */
function respondWithAccept(orderReference: string) {
  const time = Math.floor(Date.now() / 1000)
  const signature = generateWebhookResponseSignature(orderReference, 'accept', time)
  return NextResponse.json({ orderReference, status: 'accept', time, signature })
}
