/**
 * Payment Success Email Template - Ukraine Humanitarian Theme
 *
 * This is a transactional email sent immediately after successful payment.
 * Design emphasizes trust (Ukraine blue) and gratitude (Life green for success).
 */

import { EmailContent, PaymentSuccessEmailParams } from '../../../types'
import { formatCurrency, getLocalizedText, getTrackingUrl } from '../../../utils'
import { escapeHtml } from '../../../utils'
import {
  createActionBox,
  createButton,
  createDonationItemCard,
  createInfoBox,
  createOrderTotal,
  createSignature,
} from '../../base/components'
import { createEmailLayout } from '../../base/layout'
import { paymentSuccessContent } from './content'

/**
 * Generate payment success email content
 */
export function generatePaymentSuccessEmail(params: PaymentSuccessEmailParams): EmailContent {
  const { locale, donorName, donations, totalAmount, currency } = params

  const t = paymentSuccessContent[locale]
  const trackingUrl = getTrackingUrl(locale)

  // Badge text for header - using gold for positive confirmation
  const badgeText = {
    en: 'Payment Confirmed',
    zh: '支付已确认',
    ua: 'Платіж підтверджено',
  }[locale]

  // Build donation items HTML
  const donationItemsHTML = donations
    .map((donation, index) => {
      const projectName = getLocalizedText(donation.projectNameI18n, locale)
      const location = getLocalizedText(donation.locationI18n, locale)
      const unitName = getLocalizedText(donation.unitNameI18n, locale)

      // For unit mode: show "1 unit_name", for aggregate mode: empty string
      const quantityText = donation.isAggregate ? '' : t.quantityUnit(escapeHtml(unitName))

      return createDonationItemCard(
        index + 1,
        donation.donationPublicId,
        escapeHtml(projectName),
        escapeHtml(location),
        quantityText,
        formatCurrency(donation.amount, currency)
      )
    })
    .join('')

  // Build email content with Ukraine theme
  const contentHTML = `
    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      ${t.greeting(escapeHtml(donorName))}
    </p>

    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
      <strong style="color: #10B981;">${t.thankYou}</strong> ${t.confirmation}
    </p>

    <!-- Order Details Card - Ukraine blue glass style -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(7,108,179,0.15) 0%, rgba(6,90,150,0.08) 100%); border: 1px solid rgba(7,108,179,0.3); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 16px; text-transform: uppercase; letter-spacing: 1px;">${t.orderDetailsLabel}</p>
          ${donationItemsHTML}
        </td>
      </tr>
    </table>

    ${createOrderTotal(t.totalAmountLabel, formatCurrency(totalAmount, currency))}

    ${createInfoBox(t.donationIdsNote)}

    ${createActionBox(
      t.trackingTitle,
      `
      <p style="margin: 0 0 16px;">${t.trackingContent}</p>
      <div style="text-align: center;">
        ${createButton(t.trackingButton, trackingUrl, 'gold')}
      </div>
    `
    )}

    ${createActionBox(t.nextStepsTitle, `<p style="margin: 0;">${t.nextStepsContent}</p>`)}

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

  // Plain text version
  const donationItemsText = donations
    .map((donation, index) => {
      const projectName = getLocalizedText(donation.projectNameI18n, locale)
      const location = getLocalizedText(donation.locationI18n, locale)
      const unitName = getLocalizedText(donation.unitNameI18n, locale)
      const quantityText = donation.isAggregate ? '' : ` (${t.quantityUnit(unitName)})`

      return `${index + 1}. ${donation.donationPublicId}
   ${projectName}
   ${location}${quantityText}
   ${t.amountLabel} ${formatCurrency(donation.amount, currency)}`
    })
    .join('\n\n')

  const text = `
${t.greeting(donorName)}

${t.thankYou}

${t.confirmation}

${t.orderDetailsLabel}
${donationItemsText}

${t.totalAmountLabel} ${formatCurrency(totalAmount, currency)}

${t.donationIdsNote}

${t.trackingTitle}
${t.trackingContent}
${trackingUrl}

${t.nextStepsTitle}
${t.nextStepsContent}

${t.contact}
  `.trim()

  return {
    subject: t.subject,
    html,
    text,
  }
}
