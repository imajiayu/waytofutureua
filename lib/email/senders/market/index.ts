/**
 * Market Email Senders
 *
 * 义卖模块的邮件发送器，对标捐赠模块的 sender 模式。
 */

import { resend, FROM_EMAIL } from '../../client'
import type {
  MarketOrderPaidEmailParams,
  MarketOrderShippedEmailParams,
  MarketOrderCompletedEmailParams
} from '../../types'
import { generateMarketOrderPaidEmail } from '../../templates/transactional/market-order-paid'
import { generateMarketOrderShippedEmail } from '../../templates/transactional/market-order-shipped'
import { generateMarketOrderCompletedEmail } from '../../templates/transactional/market-order-completed'
import { logger } from '@/lib/logger'

/**
 * Send market order paid confirmation email
 */
export async function sendMarketOrderPaidEmail(params: MarketOrderPaidEmailParams) {
  const emailContent = generateMarketOrderPaidEmail(params)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    if (error) {
      logger.error('MARKET:EMAIL', 'Error sending order paid email', { error: error.message })
      throw error
    }

    logger.info('MARKET:EMAIL', 'Order paid email sent', { messageId: data?.id, to: params.to, orderReference: params.orderReference })
    return data
  } catch (error) {
    logger.errorWithStack('MARKET:EMAIL', 'Failed to send order paid email', error)
    throw error
  }
}

/**
 * Send market order shipped notification email
 */
export async function sendMarketOrderShippedEmail(params: MarketOrderShippedEmailParams) {
  const emailContent = generateMarketOrderShippedEmail(params)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    if (error) {
      logger.error('MARKET:EMAIL', 'Error sending order shipped email', { error: error.message })
      throw error
    }

    logger.info('MARKET:EMAIL', 'Order shipped email sent', { messageId: data?.id, to: params.to, orderReference: params.orderReference })
    return data
  } catch (error) {
    logger.errorWithStack('MARKET:EMAIL', 'Failed to send order shipped email', error)
    throw error
  }
}

/**
 * Send market order completed notification email
 */
export async function sendMarketOrderCompletedEmail(params: MarketOrderCompletedEmailParams) {
  const emailContent = generateMarketOrderCompletedEmail(params)

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    if (error) {
      logger.error('MARKET:EMAIL', 'Error sending order completed email', { error: error.message })
      throw error
    }

    logger.info('MARKET:EMAIL', 'Order completed email sent', { messageId: data?.id, to: params.to, orderReference: params.orderReference })
    return data
  } catch (error) {
    logger.errorWithStack('MARKET:EMAIL', 'Failed to send order completed email', error)
    throw error
  }
}
