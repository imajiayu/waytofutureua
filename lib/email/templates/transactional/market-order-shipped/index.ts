/**
 * Market Order Shipped Email Template - Ukraine Humanitarian Theme
 *
 * Sent when a charity market order has been shipped by admin.
 * Features a distinctive tracking info card (inspired by refund-success's
 * custom amount card) and shipping proof images matching donation-completed style.
 */

import { EmailContent, MarketOrderShippedEmailParams } from '../../../types'
import { escapeHtml, formatCurrency, getLocalizedText, getMarketOrdersUrl } from '../../../utils'
import {
  createButton,
  createDetailBox,
  createDetailRow,
  createImage,
  createSignature,
} from '../../base/components'
import { createEmailLayout } from '../../base/layout'
import { marketOrderShippedContent } from './content'

/**
 * Tracking card — distinctive visual element (like refund amount card)
 * Uses Ukraine blue + gold accent for the tracking number display
 */
function createTrackingCard(
  trackingNumber: string,
  trackingCarrier: string | undefined,
  labels: { trackingNumberLabel: string; carrierLabel: string }
): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(7,108,179,0.25) 0%, rgba(6,90,150,0.12) 100%); border: 2px solid rgba(7,108,179,0.5); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          ${
            trackingCarrier
              ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;">
            <tr>
              <td style="color: rgba(255,255,255,0.6); font-size: 13px;">${labels.carrierLabel}</td>
              <td align="right" style="color: #ffffff; font-size: 14px; font-weight: 600;">${trackingCarrier}</td>
            </tr>
          </table>
          `
              : ''
          }
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color: rgba(255,255,255,0.6); font-size: 13px;">${labels.trackingNumberLabel}</td>
              <td align="right">
                <code style="font-family: 'Courier New', monospace; font-weight: 700; color: #F5B800; font-size: 18px; background: rgba(245,184,0,0.1); padding: 4px 12px; border-radius: 8px; border: 1px solid rgba(245,184,0,0.3);">${trackingNumber}</code>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

/**
 * Generate market order shipped email content
 */
export function generateMarketOrderShippedEmail(
  params: MarketOrderShippedEmailParams
): EmailContent {
  const {
    locale,
    shippingName,
    orderReference,
    itemTitleI18n,
    quantity,
    totalAmount,
    currency,
    shippingCity,
    shippingCountry,
    trackingNumber,
    trackingCarrier,
    proofImageUrls,
  } = params

  const t = marketOrderShippedContent[locale]
  const ordersUrl = getMarketOrdersUrl(locale)
  const itemTitle = getLocalizedText(itemTitleI18n, locale)

  const badgeText = {
    en: 'Order Shipped',
    zh: '已发货',
    ua: 'Відправлено',
  }[locale]

  // Shipped notice — custom gold-accented announcement (like payment-success thankYou)
  const shippedNoticeHTML = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(245,184,0,0.15) 0%, rgba(209,154,0,0.08) 100%); border: 1px solid rgba(245,184,0,0.35); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 18px 20px;">
          <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: 700; margin: 0; line-height: 1.5;">${t.shippedNotice}</p>
        </td>
      </tr>
    </table>
  `

  // Proof images — matches donation-completed image section pattern exactly
  const proofImagesHTML =
    proofImageUrls.length > 0
      ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td>
          <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">${t.shippingProofTitle}</p>
          <p style="color: rgba(255,255,255,0.75); font-size: 15px; margin: 0 0 16px;">${t.shippingProofDescription}</p>
          ${proofImageUrls.map((url) => createImage(url, 'Shipping proof')).join('')}
        </td>
      </tr>
    </table>
  `
      : ''

  const contentHTML = `
    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      ${t.greeting(escapeHtml(shippingName))}
    </p>

    ${shippedNoticeHTML}

    <!-- Order Details — blue glass box with gold label (matches donation pattern) -->
    ${createDetailBox(`
      <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px;">${t.orderDetailsLabel}</p>
      ${createDetailRow(t.orderRefLabel, `<code style="font-family: 'Courier New', monospace; font-size: 14px; color: rgba(255,255,255,0.9); background: rgba(7,108,179,0.2); padding: 4px 10px; border-radius: 6px; border-left: 3px solid #F5B800;">${escapeHtml(orderReference)}</code>`)}
      ${createDetailRow(t.itemLabel, `<strong style="color: #1FA8E1; font-family: Georgia, 'Times New Roman', serif;">${escapeHtml(itemTitle)}</strong>`)}
      ${createDetailRow(t.quantityLabel, `<strong style="color: #ffffff;">&times;${quantity}</strong>`)}
      ${createDetailRow(t.totalAmountLabel, `<strong style="color: #10B981; font-family: 'Courier New', monospace;">${formatCurrency(totalAmount, currency)}</strong>`)}
      ${createDetailRow(t.shippingToLabel, `${escapeHtml(shippingName)}, ${escapeHtml(shippingCity)}, ${escapeHtml(shippingCountry)}`)}
    `)}

    <!-- Tracking Card — distinctive element (like refund amount card) -->
    ${createTrackingCard(
      escapeHtml(trackingNumber),
      trackingCarrier ? escapeHtml(trackingCarrier) : undefined,
      { trackingNumberLabel: t.trackingNumberLabel, carrierLabel: t.carrierLabel }
    )}

    ${proofImagesHTML}

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          ${createButton(t.viewOrderButton, ordersUrl, 'blue')}
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td>
          <p style="color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.6; margin: 0; font-style: italic;">
            ${t.deliveryNote}
          </p>
        </td>
      </tr>
    </table>

    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 28px 0 0;">
      ${t.contact}
    </p>

    ${createSignature(locale)}
  `

  const html = createEmailLayout({
    title: t.title,
    content: contentHTML,
    locale,
    badge: badgeText,
  })

  const text = `
${t.greeting(shippingName)}

${t.shippedNotice}

${t.orderDetailsLabel}
${t.orderRefLabel} ${orderReference}
${t.itemLabel} ${itemTitle}
${t.quantityLabel} x${quantity}
${t.totalAmountLabel} ${formatCurrency(totalAmount, currency)}
${t.shippingToLabel} ${shippingName}, ${shippingCity}, ${shippingCountry}

${t.trackingTitle}
${t.trackingNumberLabel} ${trackingNumber}
${trackingCarrier ? `${t.carrierLabel} ${trackingCarrier}` : ''}

${proofImageUrls.length > 0 ? `${t.shippingProofTitle}\n${t.shippingProofDescription}\n${proofImageUrls.join('\n')}` : ''}

${t.deliveryNote}

${ordersUrl}

${t.contact}
  `.trim()

  return {
    subject: t.subject(orderReference),
    html,
    text,
  }
}
