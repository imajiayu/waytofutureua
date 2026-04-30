/**
 * Market Order Paid Email Template - Ukraine Humanitarian Theme
 *
 * Sent when a charity market order payment is confirmed.
 * Features a custom market item card (inspired by createDonationItemCard)
 * with item name, quantity breakdown, and shipping destination.
 */

import { EmailContent, MarketOrderPaidEmailParams } from '../../../types'
import { escapeHtml, formatCurrency, getLocalizedText, getMarketOrdersUrl } from '../../../utils'
import {
  createActionBox,
  createButton,
  createInfoBox,
  createOrderTotal,
  createSignature,
} from '../../base/components'
import { createEmailLayout } from '../../base/layout'
import { marketOrderPaidContent } from './content'

/**
 * Market item card — visually rich single-item display
 * Inspired by createDonationItemCard: gold accent, blue glass, prominent layout
 */
function createMarketItemCard(
  orderRef: string,
  itemTitle: string,
  quantity: number,
  unitPrice: string,
  shippingTo: string,
  labels: {
    orderRefLabel: string
    itemLabel: string
    quantityLabel: string
    unitPriceLabel: string
    shippingToLabel: string
  }
): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(7,108,179,0.15) 0%, rgba(6,90,150,0.08) 100%); border: 1px solid rgba(7,108,179,0.3); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <!-- Order Reference Header -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid rgba(7,108,179,0.25);">
            <tr>
              <td>
                <span style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">${labels.orderRefLabel}</span>
              </td>
              <td align="right">
                <code style="font-family: 'Courier New', monospace; font-size: 14px; color: rgba(255,255,255,0.9); background: rgba(7,108,179,0.25); padding: 4px 12px; border-radius: 6px; border-left: 3px solid #F5B800;">${orderRef}</code>
              </td>
            </tr>
          </table>

          <!-- Item Title — prominent display -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 14px;">
            <tr>
              <td width="32" valign="top">
                <div style="width: 28px; height: 28px; line-height: 28px; text-align: center; background: linear-gradient(135deg, #F5B800 0%, #D19A00 100%); color: #02263E; border-radius: 50%; font-size: 14px; font-weight: 700;">&#9733;</div>
              </td>
              <td style="padding-left: 10px;" valign="middle">
                <p style="font-family: Georgia, 'Times New Roman', serif; font-weight: 700; color: #1FA8E1; font-size: 17px; margin: 0; line-height: 1.3;">${itemTitle}</p>
              </td>
            </tr>
          </table>

          <!-- Details Grid -->
          <table width="100%" cellpadding="0" cellspacing="0" style="padding-left: 38px;">
            <tr>
              <td style="padding: 4px 0;">
                <span style="color: rgba(255,255,255,0.5); font-size: 13px;">${labels.quantityLabel}</span>
                <span style="color: #ffffff; font-size: 14px; font-weight: 600; margin-left: 8px;">&times;${quantity}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">
                <span style="color: rgba(255,255,255,0.5); font-size: 13px;">${labels.unitPriceLabel}</span>
                <span style="color: rgba(255,255,255,0.85); font-family: 'Courier New', monospace; font-size: 14px; margin-left: 8px;">${unitPrice}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0 0;">
                <span style="color: rgba(255,255,255,0.5); font-size: 13px;">${labels.shippingToLabel}</span>
                <span style="color: rgba(255,255,255,0.85); font-size: 14px; margin-left: 8px;">${shippingTo}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

/**
 * Generate market order paid email content
 */
export function generateMarketOrderPaidEmail(params: MarketOrderPaidEmailParams): EmailContent {
  const {
    locale,
    shippingName,
    orderReference,
    itemTitleI18n,
    quantity,
    unitPrice,
    totalAmount,
    currency,
    shippingCity,
    shippingCountry,
  } = params

  const t = marketOrderPaidContent[locale]
  const ordersUrl = getMarketOrdersUrl(locale)
  const itemTitle = getLocalizedText(itemTitleI18n, locale)
  const shippingTo = `${escapeHtml(shippingName)}, ${escapeHtml(shippingCity)}, ${escapeHtml(shippingCountry)}`

  const badgeText = {
    en: 'Payment Confirmed',
    zh: '支付已确认',
    ua: 'Платіж підтверджено',
  }[locale]

  const contentHTML = `
    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      ${t.greeting(escapeHtml(shippingName))}
    </p>

    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
      <strong style="color: #10B981;">${t.thankYou}</strong> ${t.confirmation}
    </p>

    <!-- Market Item Card — custom styled like donation item card -->
    ${createMarketItemCard(
      escapeHtml(orderReference),
      escapeHtml(itemTitle),
      quantity,
      formatCurrency(unitPrice, currency),
      shippingTo,
      {
        orderRefLabel: t.orderRefLabel,
        itemLabel: t.itemLabel,
        quantityLabel: t.quantityLabel,
        unitPriceLabel: t.unitPriceLabel,
        shippingToLabel: t.shippingToLabel,
      }
    )}

    ${createOrderTotal(t.totalAmountLabel, formatCurrency(totalAmount, currency))}

    ${createInfoBox(t.orderRefLabel + ' ' + escapeHtml(orderReference))}

    ${createActionBox(
      t.nextStepsTitle,
      `
      <p style="margin: 0 0 16px;">${t.nextStepsContent}</p>
      <div style="text-align: center;">
        ${createButton(t.viewOrderButton, ordersUrl, 'gold')}
      </div>
    `
    )}

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

${t.thankYou}

${t.confirmation}

${t.orderRefLabel} ${orderReference}
${t.itemLabel} ${itemTitle}
${t.quantityLabel} x${quantity}
${t.unitPriceLabel} ${formatCurrency(unitPrice, currency)}
${t.totalAmountLabel} ${formatCurrency(totalAmount, currency)}
${t.shippingToLabel} ${shippingName}, ${shippingCity}, ${shippingCountry}

${t.nextStepsTitle}
${t.nextStepsContent}
${ordersUrl}

${t.contact}
  `.trim()

  return {
    subject: t.subject(orderReference),
    html,
    text,
  }
}
