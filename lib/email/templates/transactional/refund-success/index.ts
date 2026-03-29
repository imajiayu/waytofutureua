/**
 * Refund Success Email Template - Ukraine Humanitarian Theme
 *
 * This transactional email is sent when a refund has been processed.
 * Design uses warm orange tones (not aggressive red) to convey information
 * without alarming the recipient, while maintaining trust.
 */

import { RefundSuccessEmailParams, EmailContent } from '../../../types'
import { getLocalizedText, formatCurrency } from '../../../utils'
import { createEmailLayout } from '../../base/layout'
import {
  createDetailBox,
  createDonationIdsList,
  createInfoBox,
  createSignature,
  createErrorBox
} from '../../base/components'
import { refundSuccessContent } from './content'
import { escapeHtml } from '../../../utils'

/**
 * Generate refund success email content
 */
export function generateRefundSuccessEmail(params: RefundSuccessEmailParams): EmailContent {
  const {
    locale,
    donorName,
    projectNameI18n,
    donationIds,
    refundAmount,
    currency
  } = params

  const t = refundSuccessContent[locale]
  const projectName = getLocalizedText(projectNameI18n, locale)

  // Badge text for header - neutral tone
  const badgeText = {
    en: 'Refund Processed',
    zh: '退款已处理',
    ua: 'Повернення оброблено'
  }[locale]

  // Build email content with Ukraine theme - warm but informational
  const contentHTML = `
    <p style="color: rgba(255,255,255,0.9); font-size: 16px; line-height: 1.7; margin: 0 0 20px;">
      ${t.greeting(escapeHtml(donorName))}
    </p>

    <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 28px;">
      <strong style="color: #ffffff; font-family: Georgia, 'Times New Roman', serif;">${t.confirmation}</strong>
    </p>

    <p style="color: rgba(255,255,255,0.75); font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
      ${t.processed}
    </p>

    <!-- Refund Amount Card - Warm orange style (not aggressive red) -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(231,111,81,0.2) 0%, rgba(200,90,61,0.1) 100%); border: 1px solid rgba(231,111,81,0.4); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="color: rgba(255,255,255,0.7); font-weight: 600; font-size: 14px;">${t.refundAmountLabel}</td>
              <td align="right" style="font-family: 'Courier New', monospace; font-weight: 700; color: #F7A989; font-size: 24px;">${formatCurrency(refundAmount, currency)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Donation IDs -->
    ${createDetailBox(`
      <p style="color: #F5B800; font-family: Georgia, 'Times New Roman', serif; font-size: 13px; font-weight: 600; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 1px;">${t.donationIdsLabel}</p>
      ${createDonationIdsList(donationIds)}
    `)}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td>
          <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
            ${t.gratitude}
          </p>
          <p style="color: rgba(255,255,255,0.75); font-size: 16px; line-height: 1.7; margin: 0;">
            ${t.hopeToContinue}
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
    badge: badgeText
  })

  // Plain text version
  const text = `
${t.greeting(donorName)}

${t.confirmation}

${t.processed}

${t.refundAmountLabel} ${formatCurrency(refundAmount, currency)}

${t.donationIdsLabel}
${donationIds.map(id => `- ${id}`).join('\n')}

${t.gratitude}

${t.hopeToContinue}

${t.contact}
  `.trim()

  return {
    subject: t.subject,
    html,
    text
  }
}
