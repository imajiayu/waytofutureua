/**
 * Market Email Senders
 *
 * 义卖模块的邮件发送器，对标捐赠模块的 sender 模式。
 */

import { sendEmail } from '../../send'
import { generateMarketOrderCompletedEmail } from '../../templates/transactional/market-order-completed'
import { generateMarketOrderPaidEmail } from '../../templates/transactional/market-order-paid'
import { generateMarketOrderShippedEmail } from '../../templates/transactional/market-order-shipped'
import type {
  MarketOrderCompletedEmailParams,
  MarketOrderPaidEmailParams,
  MarketOrderShippedEmailParams,
} from '../../types'

export async function sendMarketOrderPaidEmail(params: MarketOrderPaidEmailParams) {
  const { subject, html, text } = generateMarketOrderPaidEmail(params)
  return sendEmail({
    to: params.to,
    locale: params.locale,
    subject,
    html,
    text,
    category: 'MARKET:EMAIL',
    label: 'order paid',
    meta: { orderReference: params.orderReference },
  })
}

export async function sendMarketOrderShippedEmail(params: MarketOrderShippedEmailParams) {
  const { subject, html, text } = generateMarketOrderShippedEmail(params)
  return sendEmail({
    to: params.to,
    locale: params.locale,
    subject,
    html,
    text,
    category: 'MARKET:EMAIL',
    label: 'order shipped',
    meta: { orderReference: params.orderReference },
  })
}

export async function sendMarketOrderCompletedEmail(params: MarketOrderCompletedEmailParams) {
  const { subject, html, text } = generateMarketOrderCompletedEmail(params)
  return sendEmail({
    to: params.to,
    locale: params.locale,
    subject,
    html,
    text,
    category: 'MARKET:EMAIL',
    label: 'order completed',
    meta: { orderReference: params.orderReference },
  })
}
