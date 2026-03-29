/**
 * Market Order Completed Email Template - Ukraine Humanitarian Theme
 *
 * Celebratory email sent when a charity market order is marked as completed.
 * Design mirrors donation-completed: green success box, bold impact text,
 * proof images with gold label, green CTA, share encouragement.
 */

import { MarketOrderCompletedEmailParams, EmailContent } from '../../../types'
import { getLocalizedText, formatCurrency, getMarketOrdersUrl, escapeHtml } from '../../../utils'
import { createEmailLayout } from '../../base/layout'
import {
  createDetailBox,
  createDetailRow,
  createSuccessBox,
  createImage,
  createButton,
  createSignature
} from '../../base/components'
import { marketOrderCompletedContent } from './content'

/**
 * Generate market order completed email content
 */
export function generateMarketOrderCompletedEmail(params: MarketOrderCompletedEmailParams): EmailContent {
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
    proofImageUrls
  } = params

  const t = marketOrderCompletedContent[locale]
  const ordersUrl = getMarketOrdersUrl(locale)
  const itemTitle = getLocalizedText(itemTitleI18n, locale)

  const badgeText = {
    en: 'Order Complete',
    zh: '订单完成',
    ua: 'Замовлення завершено'
  }[locale]

  // Fund usage proof — identical to donation-completed image section
  const proofImagesHTML = proofImageUrls.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td>
          <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">${t.fundUsageProofTitle}</p>
          <p style="color: rgba(255,255,255,0.75); font-size: 15px; margin: 0 0 16px;">${t.fundUsageProofDescription}</p>
          ${proofImageUrls.map(url => createImage(url, 'Fund usage proof')).join('')}
        </td>
      </tr>
    </table>
  ` : ''

  const contentHTML = `
    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      ${t.greeting(escapeHtml(shippingName))}
    </p>

    <!-- Congratulations — green success box (identical to donation-completed) -->
    ${createSuccessBox(t.congratulations, t.completedMessage)}

    <!-- Impact statement — white bold Georgia (identical to donation-completed) -->
    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
      ${t.impactMessage}
    </p>

    <!-- Order Details — blue glass with gold label + blue/green data emphasis -->
    ${createDetailBox(`
      <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px;">${t.orderDetailsLabel}</p>
      ${createDetailRow(t.orderRefLabel, `<code style="font-family: 'Courier New', monospace; font-size: 14px; color: rgba(255,255,255,0.9); background: rgba(7,108,179,0.2); padding: 4px 10px; border-radius: 6px; border-left: 3px solid #F5B800;">${escapeHtml(orderReference)}</code>`)}
      ${createDetailRow(t.itemLabel, `<strong style="color: #1FA8E1; font-family: Georgia, 'Times New Roman', serif;">${escapeHtml(itemTitle)}</strong>`)}
      ${createDetailRow(t.quantityLabel, `<strong style="color: #10B981;">&times;${quantity}</strong>`)}
      ${createDetailRow(t.totalAmountLabel, `<strong style="color: #10B981; font-family: 'Courier New', monospace;">${formatCurrency(totalAmount, currency)}</strong>`)}
      ${createDetailRow(t.shippingToLabel, `${escapeHtml(shippingName)}, ${escapeHtml(shippingCity)}, ${escapeHtml(shippingCountry)}`)}
    `)}

    ${proofImagesHTML}

    <!-- CTA Button — green for success/completion (identical to donation-completed) -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          ${createButton(t.viewOrderButton, ordersUrl, 'green')}
        </td>
      </tr>
    </table>

    <!-- Gratitude — white bold Georgia (identical to donation-completed) -->
    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      <strong style="color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">${t.gratitude}</strong>
    </p>

    <!-- Share encouragement — green success box (identical to donation-completed) -->
    ${createSuccessBox(t.shareTitle, t.shareContent)}

    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 28px 0 0;">
      ${t.contact}
    </p>

    ${createSignature(locale)}
  `

  const html = createEmailLayout({
    title: t.title,
    content: contentHTML,
    locale,
    badge: badgeText
  })

  const text = `
${t.greeting(shippingName)}

${t.congratulations}
${t.completedMessage}

${t.impactMessage}

${t.orderDetailsLabel}
${t.orderRefLabel} ${orderReference}
${t.itemLabel} ${itemTitle}
${t.quantityLabel} x${quantity}
${t.totalAmountLabel} ${formatCurrency(totalAmount, currency)}
${t.shippingToLabel} ${shippingName}, ${shippingCity}, ${shippingCountry}

${proofImageUrls.length > 0 ? `${t.fundUsageProofTitle}\n${t.fundUsageProofDescription}\n${proofImageUrls.join('\n')}` : ''}

${t.gratitude}

${t.shareTitle}
${t.shareContent}

${ordersUrl}

${t.contact}
  `.trim()

  return {
    subject: t.subject(orderReference),
    html,
    text
  }
}
