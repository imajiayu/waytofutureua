/**
 * Refund Success Email Sender
 */

import { logger } from '@/lib/logger'

import { getFromEmail, resend } from '../client'
import { generateRefundSuccessEmail } from '../templates/transactional/refund-success'
import { RefundSuccessEmailParams } from '../types'

/**
 * Send refund success notification email
 */
export async function sendRefundSuccessEmail(params: RefundSuccessEmailParams) {
  const emailContent = generateRefundSuccessEmail(params)

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(params.locale),
      to: params.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (error) {
      logger.error('EMAIL', 'Error sending refund success email', { error: error.message })
      throw error
    }

    logger.info('EMAIL', 'Refund success email sent', { messageId: data?.id })
    return data
  } catch (error) {
    logger.errorWithStack('EMAIL', 'Failed to send refund success email', error)
    throw error
  }
}
