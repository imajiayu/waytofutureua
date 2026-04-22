/**
 * Payment Success Email Sender
 */

import { resend, getFromEmail } from '../client'
import { PaymentSuccessEmailParams } from '../types'
import { generatePaymentSuccessEmail } from '../templates/transactional/payment-success'
import { logger } from '@/lib/logger'

/**
 * Send payment success confirmation email
 */
export async function sendPaymentSuccessEmail(params: PaymentSuccessEmailParams) {
  const emailContent = generatePaymentSuccessEmail(params)

  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(params.locale),
      to: params.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    if (error) {
      logger.error('EMAIL', 'Error sending payment success email', { error: error.message })
      throw error
    }

    logger.info('EMAIL', 'Payment success email sent', { messageId: data?.id })
    return data
  } catch (error) {
    logger.errorWithStack('EMAIL', 'Failed to send payment success email', error)
    throw error
  }
}
