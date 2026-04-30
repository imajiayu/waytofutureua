/**
 * Donation Completed Email Sender
 */

import { logger } from '@/lib/logger'

import { getFromEmail, resend } from '../client'
import { generateDonationCompletedEmail } from '../templates/transactional/donation-completed'
import { DonationCompletedEmailParams } from '../types'

/**
 * Send donation completed notification email
 */
export async function sendDonationCompletedEmail(params: DonationCompletedEmailParams) {
  const emailContent = generateDonationCompletedEmail(params)

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(params.locale),
      to: params.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (error) {
      logger.error('EMAIL', 'Error sending donation completed email', { error: error.message })
      throw error
    }

    logger.info('EMAIL', 'Donation completed email sent', { messageId: data?.id })
    return data
  } catch (error) {
    logger.errorWithStack('EMAIL', 'Failed to send donation completed email', error)
    throw error
  }
}
