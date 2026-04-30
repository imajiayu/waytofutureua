/**
 * Donation Completed Email Template - Ukraine Humanitarian Theme
 *
 * This celebratory email is sent when a donation has been successfully delivered.
 * Design emphasizes success (Life green) and gratitude (gold accents).
 */

import { DonationCompletedEmailParams, EmailContent } from '../../../types'
import { formatCurrency, getLocalizedText, getTrackingUrl } from '../../../utils'
import { escapeHtml } from '../../../utils'
import {
  createButton,
  createDetailBox,
  createDetailRow,
  createDonationIdsList,
  createImage,
  createSignature,
  createSuccessBox,
} from '../../base/components'
import { createEmailLayout } from '../../base/layout'
import { donationCompletedContent } from './content'

/**
 * Generate donation completed email content
 */
export function generateDonationCompletedEmail(params: DonationCompletedEmailParams): EmailContent {
  const {
    locale,
    donorName,
    projectNameI18n,
    locationI18n,
    unitNameI18n,
    donationIds,
    quantity,
    totalAmount,
    currency,
    resultImageUrl,
  } = params

  const t = donationCompletedContent[locale]
  const projectName = getLocalizedText(projectNameI18n, locale)
  const location = getLocalizedText(locationI18n, locale)
  const unitName = getLocalizedText(unitNameI18n, locale)
  const trackingUrl = getTrackingUrl(locale)

  // Badge text for header - celebratory gold
  const badgeText = {
    en: 'Mission Complete',
    zh: '使命达成',
    ua: 'Місію виконано',
  }[locale]

  // Build email content with Ukraine theme - celebratory style
  const contentHTML = `
    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      ${t.greeting(escapeHtml(donorName))}
    </p>

    ${createSuccessBox(t.congratulations, t.completed)}

    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
      ${t.impact}
    </p>

    <!-- Donation Details - Ukraine blue with gold highlights -->
    ${createDetailBox(`
      ${createDetailRow(t.projectLabel, `<strong style="color: #1FA8E1; font-family: Georgia, 'Times New Roman', serif;">${escapeHtml(projectName)}</strong>`)}
      ${createDetailRow(t.locationLabel, escapeHtml(location))}
      ${createDetailRow(t.quantityLabel, `<strong style="color: #10B981;">${quantity} ${escapeHtml(unitName)}</strong>`)}
      ${createDetailRow(t.totalAmountLabel, `<strong style="color: #10B981; font-family: 'Courier New', monospace;">${formatCurrency(totalAmount, currency)}</strong>`)}
    `)}

    <!-- Donation IDs -->
    ${createDetailBox(`
      <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">${t.donationIdsLabel}</p>
      ${createDonationIdsList(donationIds)}
    `)}

    ${
      resultImageUrl
        ? `
      <!-- Result Image -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
        <tr>
          <td>
            <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">${t.resultTitle}</p>
            <p style="color: rgba(255,255,255,0.75); font-size: 15px; margin: 0 0 16px;">${t.resultDescription}</p>
            ${createImage(resultImageUrl, 'Donation delivery confirmation')}
          </td>
        </tr>
      </table>
    `
        : ''
    }

    <!-- CTA Button - Green for success/completion -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          ${createButton(t.trackingButton, trackingUrl, 'green')}
          <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 12px 0 0;">${t.trackingHint}</p>
        </td>
      </tr>
    </table>

    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      <strong style="color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">${t.gratitude}</strong>
    </p>

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
    badge: badgeText,
  })

  // Plain text version
  const text = `
${t.greeting(donorName)}

${t.congratulations}
${t.completed}

${t.impact}

${t.projectLabel} ${projectName}
${t.locationLabel} ${location}
${t.quantityLabel} ${quantity} ${unitName}
${t.totalAmountLabel} ${formatCurrency(totalAmount, currency)}

${t.donationIdsLabel}
${donationIds.map((id) => `- ${id}`).join('\n')}

${resultImageUrl ? `${t.resultTitle}\n${t.resultDescription}\n${resultImageUrl}\n` : ''}

${t.gratitude}

${t.shareTitle}
${t.shareContent}

${t.contact}
  `.trim()

  return {
    subject: t.subject,
    html,
    text,
  }
}
