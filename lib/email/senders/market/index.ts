/**
 * Market Email Senders
 *
 * 义卖模块的邮件发送器。
 */

import { resend, FROM_EMAIL } from '../../client'
import { logger } from '@/lib/logger'

/** HTML 实体转义，防止邮件模板注入 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface MarketEmailParams {
  to: string
  locale: string
}

interface SaleOrderConfirmedParams extends MarketEmailParams {
  orderReference: string
  itemTitle: string
  quantity: number
  totalAmount: number
  currency: string
  shippingName: string
  shippingCity: string
  shippingCountry: string
}

interface OrderShippedParams extends MarketEmailParams {
  orderReference: string
  itemTitle: string
  trackingNumber: string
  trackingCarrier?: string
}

// ============================================
// 发送函数
// ============================================

export async function sendSaleOrderConfirmedEmail(params: SaleOrderConfirmedParams) {
  // TODO: 替换为品牌化 HTML 模板
  const title = escapeHtml(params.itemTitle)
  const ref = escapeHtml(params.orderReference)
  const subject = `Order Confirmed: ${params.orderReference}`
  const html = `<p>Your order ${ref} for ${title} (x${params.quantity}) has been confirmed.</p>
    <p>Total: ${params.totalAmount} ${escapeHtml(params.currency)}</p>
    <p>Shipping to: ${escapeHtml(params.shippingName)}, ${escapeHtml(params.shippingCity)}, ${escapeHtml(params.shippingCountry)}</p>`

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html })
    logger.info('MARKET:EMAIL', 'Sale order confirmed email sent', { to: params.to, orderReference: params.orderReference })
  } catch (error) {
    logger.error('MARKET:EMAIL', 'Failed to send sale confirmed email', { error: error instanceof Error ? error.message : String(error) })
  }
}

export async function sendOrderShippedEmail(params: OrderShippedParams) {
  // TODO: 替换为品牌化 HTML 模板
  const title = escapeHtml(params.itemTitle)
  const ref = escapeHtml(params.orderReference)
  const subject = `Your order ${params.orderReference} has been shipped`
  const html = `<p>Your order for &quot;${title}&quot; has been shipped.</p>
    <p>Tracking number: ${escapeHtml(params.trackingNumber)}</p>
    ${params.trackingCarrier ? `<p>Carrier: ${escapeHtml(params.trackingCarrier)}</p>` : ''}`

  try {
    await resend.emails.send({ from: FROM_EMAIL, to: params.to, subject, html })
    logger.info('MARKET:EMAIL', 'Order shipped email sent', { to: params.to, orderReference: params.orderReference })
  } catch (error) {
    logger.error('MARKET:EMAIL', 'Failed to send shipped email', { error: error instanceof Error ? error.message : String(error) })
  }
}
