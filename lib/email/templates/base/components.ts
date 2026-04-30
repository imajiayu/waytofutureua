/**
 * Reusable Email Components - Ukraine Humanitarian Theme
 *
 * Design Language:
 * - Ukraine blue (#076CB3) for trust and information
 * - Ukraine gold (#F5B800) for CTAs and highlights
 * - Life green (#10B981) for success states
 * - Warm orange (#E76F51) for warnings and urgent alerts
 *
 * Typography (web-safe approximation):
 * - Georgia for display/headings (approximates Fraunces warmth)
 * - System fonts for body text (clean, readable)
 * - Courier New for data/IDs (monospace for clarity)
 *
 * All components use inline styles for maximum email client compatibility
 */

import { EMAIL_COLORS, ORG_BRANDING } from '../../config'
import { Locale } from '../../types'
import { getLocalizedText } from '../../utils'

/**
 * Email header with glassmorphism style - Ukraine themed
 */
export function createHeader(
  title: string,
  locale: Locale,
  badge?: string,
  subtitle?: string
): string {
  const badgeText =
    badge ||
    {
      en: 'Way to Future UA',
      zh: '乌克兰未来之路',
      ua: 'Way to Future UA',
    }[locale]

  return `
    <!-- Ukraine-themed Header with Gold Accent -->
    <tr>
      <td style="padding: 24px 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background: linear-gradient(135deg, rgba(7,108,179,0.3) 0%, rgba(6,90,150,0.2) 100%); border: 1px solid rgba(7,108,179,0.4); border-radius: 20px; padding: 28px; text-align: center;">
              <div style="display: inline-block; padding: 6px 16px; background: linear-gradient(135deg, #F5B800 0%, #D19A00 100%); border-radius: 50px; margin-bottom: 12px;">
                <span style="color: #02263E; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">${badgeText}</span>
              </div>
              <h1 style="color: #ffffff; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 700; margin: 0 0 8px; line-height: 1.3;">
                ${title}
              </h1>
              ${subtitle ? `<p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0;">${subtitle}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

/**
 * Email footer with organization information and links - Ukraine themed
 */
export function createFooter(locale: Locale): string {
  const orgName = getLocalizedText(ORG_BRANDING.name, locale)

  const footerText = {
    en: {
      automated: 'This is an automated email. Please do not reply to this message.',
      contact: 'If you have any questions, please contact us at',
      website: 'Visit our website',
      copyright: `© ${new Date().getFullYear()} ${orgName}. All rights reserved.`,
    },
    zh: {
      automated: '这是一封自动发送的邮件，请勿回复。',
      contact: '如有任何疑问，请联系我们：',
      website: '访问我们的网站',
      copyright: `© ${new Date().getFullYear()} ${orgName}。保留所有权利。`,
    },
    ua: {
      automated: 'Це автоматичний лист. Будь ласка, не відповідайте на це повідомлення.',
      contact: "Якщо у вас виникнуть запитання, зв'яжіться з нами за адресою",
      website: 'Відвідайте наш сайт',
      copyright: `© ${new Date().getFullYear()} ${orgName}. Всі права захищені.`,
    },
  }

  const t = footerText[locale]

  return `
    <!-- Footer - Ukraine themed -->
    <tr>
      <td style="background: linear-gradient(180deg, rgba(4,55,91,0.5) 0%, rgba(2,38,62,0.8) 100%); padding: 24px; border-top: 2px solid rgba(245,184,0,0.3);">
        <p style="color: rgba(255,255,255,0.5); font-size: 13px; text-align: center; margin: 0 0 12px;">
          ${t.automated}
        </p>
        <p style="color: rgba(255,255,255,0.5); font-size: 13px; text-align: center; margin: 0 0 12px;">
          ${t.contact} <a href="mailto:${ORG_BRANDING.contactEmail}" style="color: #F5B800; text-decoration: none;">${ORG_BRANDING.contactEmail}</a>
        </p>
        <p style="text-align: center; margin: 0 0 12px;">
          <a href="${ORG_BRANDING.websiteUrl}" style="color: #F5B800; font-size: 13px; text-decoration: none;">${t.website}</a>
        </p>
        <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center; margin: 0;">
          ${t.copyright}
        </p>
      </td>
    </tr>
  `
}

/**
 * Email signature - Ukraine themed
 */
export function createSignature(locale: Locale): string {
  const orgName = getLocalizedText(ORG_BRANDING.name, locale)

  const signatureText = {
    en: {
      regards: 'With heartfelt gratitude,',
      team: 'Team',
    },
    zh: {
      regards: '衷心感谢，',
      team: '团队',
    },
    ua: {
      regards: 'З щирою вдячністю,',
      team: 'Команда',
    },
  }

  const t = signatureText[locale]

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(245,184,0,0.3);">
      <tr>
        <td>
          <p style="color: rgba(255,255,255,0.75); font-size: 16px; margin: 0 0 8px;">${t.regards}</p>
          <p style="color: #ffffff; font-family: Georgia, 'Times New Roman', serif; font-weight: 600; font-size: 17px; margin: 0 0 8px;">${orgName} ${t.team}</p>
          <p style="margin: 0;">
            <a href="mailto:${ORG_BRANDING.contactEmail}" style="color: #F5B800; font-size: 14px; text-decoration: none;">${ORG_BRANDING.contactEmail}</a>
          </p>
        </td>
      </tr>
    </table>
  `
}

/**
 * Detail box component - Ukraine blue glass style
 */
export function createDetailBox(content: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(7,108,179,0.15) 0%, rgba(6,90,150,0.08) 100%); border: 1px solid rgba(7,108,179,0.3); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          ${content}
        </td>
      </tr>
    </table>
  `
}

/**
 * Detail row component - with Ukraine styling
 */
export function createDetailRow(label: string, value: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 8px 0;">
      <tr>
        <td style="color: rgba(255,255,255,0.7); font-weight: 600; font-size: 14px; padding-bottom: 4px;">${label}</td>
      </tr>
      <tr>
        <td style="color: #ffffff; font-size: 15px;">${value}</td>
      </tr>
    </table>
  `
}

/**
 * Info box component - Ukraine gold style (for important notices)
 */
export function createInfoBox(content: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(245,184,0,0.2) 0%, rgba(209,154,0,0.1) 100%); border: 1px solid rgba(245,184,0,0.4); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 16px;">
          <p style="color: #F5B800; font-size: 14px; margin: 0; line-height: 1.6;">${content}</p>
        </td>
      </tr>
    </table>
  `
}

/**
 * Success box component - Life green style
 */
export function createSuccessBox(title: string, content: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.1) 100%); border: 1px solid rgba(16,185,129,0.4); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="color: #10B981; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; font-weight: 700; margin: 0 0 8px;">${title}</p>
          <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0; line-height: 1.6;">${content}</p>
        </td>
      </tr>
    </table>
  `
}

/**
 * Action box component - Ukraine blue style
 */
export function createActionBox(title: string, content: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(7,108,179,0.2) 0%, rgba(6,90,150,0.1) 100%); border: 1px solid rgba(7,108,179,0.4); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="color: #1FA8E1; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: 700; margin: 0 0 8px;">${title}</p>
          <div style="color: rgba(255,255,255,0.85); font-size: 15px; line-height: 1.6;">${content}</div>
        </td>
      </tr>
    </table>
  `
}

/**
 * Error/Alert box component - Warm orange style
 */
export function createErrorBox(title: string, content: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(231,111,81,0.2) 0%, rgba(200,90,61,0.1) 100%); border: 1px solid rgba(231,111,81,0.4); border-radius: 16px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px;">
          <p style="color: #F7A989; font-family: Georgia, 'Times New Roman', serif; font-size: 15px; font-weight: 700; margin: 0 0 8px;">${title}</p>
          <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0; line-height: 1.6;">${content}</p>
        </td>
      </tr>
    </table>
  `
}

/**
 * Button component - Ukraine themed
 * - 'gold': Primary CTA using Ukraine gold (hope, action)
 * - 'blue': Secondary using Ukraine blue (trust, information)
 * - 'green': Success using Life green (completion)
 */
export function createButton(
  text: string,
  url: string,
  color: 'blue' | 'green' | 'gold' = 'gold'
): string {
  const styles = {
    gold: {
      gradient: 'linear-gradient(135deg, #F5B800 0%, #D19A00 100%)',
      textColor: '#02263E',
    },
    blue: {
      gradient: 'linear-gradient(135deg, #076CB3 0%, #065A96 100%)',
      textColor: '#ffffff',
    },
    green: {
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      textColor: '#ffffff',
    },
  }

  const style = styles[color]

  return `<a href="${url}" style="display: inline-block; background: ${style.gradient}; color: ${style.textColor} !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">${text}</a>`
}

/**
 * Donation IDs list component - with Ukraine gold accent
 */
export function createDonationIdsList(donationIds: string[]): string {
  const items = donationIds
    .map(
      (id) => `
    <tr>
      <td style="background: rgba(7,108,179,0.15); border-left: 3px solid #F5B800; padding: 10px 14px; margin: 0; border-radius: 0 8px 8px 0;">
        <code style="font-family: 'Courier New', monospace; font-size: 14px; color: rgba(255,255,255,0.9);">${id}</code>
      </td>
    </tr>
    <tr><td style="height: 8px;"></td></tr>
  `
    )
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${items}
    </table>
  `
}

/**
 * Image component with rounded corners and Ukraine blue border
 */
export function createImage(src: string, alt: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td align="center">
          <img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 16px; border: 2px solid rgba(7,108,179,0.4); display: block;" />
        </td>
      </tr>
    </table>
  `
}

/**
 * Donation item card for multi-donation orders - Ukraine themed
 * @param index - 1-based index for display
 * @param donationId - Donation public ID
 * @param projectName - Localized project name
 * @param location - Localized location
 * @param quantity - Quantity text (e.g., "1 unit" or empty for aggregate mode)
 * @param amount - Formatted amount string (e.g., "$10.00")
 */
export function createDonationItemCard(
  index: number,
  donationId: string,
  projectName: string,
  location: string,
  quantity: string,
  amount: string
): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(7,108,179,0.1) 0%, rgba(6,90,150,0.05) 100%); border: 1px solid rgba(7,108,179,0.3); border-radius: 12px; margin: 12px 0;">
      <tr>
        <td style="padding: 16px;">
          <!-- Header Row -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="32" valign="top">
                <div style="width: 28px; height: 28px; line-height: 28px; text-align: center; background: linear-gradient(135deg, #F5B800 0%, #D19A00 100%); color: #02263E; border-radius: 50%; font-size: 13px; font-weight: 700;">${index}</div>
              </td>
              <td style="padding-left: 10px;" valign="middle">
                <code style="font-family: 'Courier New', monospace; font-size: 13px; color: rgba(255,255,255,0.7); background: rgba(7,108,179,0.2); padding: 4px 10px; border-radius: 6px;">${donationId}</code>
              </td>
              <td align="right" valign="middle">
                <span style="font-weight: 700; font-size: 16px; color: #10B981;">${amount}</span>
              </td>
            </tr>
          </table>
          <!-- Details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 10px; padding-left: 38px;">
            <tr>
              <td>
                <p style="font-family: Georgia, 'Times New Roman', serif; font-weight: 600; color: #ffffff; font-size: 15px; margin: 0;">${projectName}</p>
                <p style="color: rgba(255,255,255,0.6); font-size: 14px; margin: 4px 0 0;">${location}</p>
                ${quantity ? `<p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 4px 0 0; font-style: italic;">${quantity}</p>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

/**
 * Order total component - Life green success style
 */
export function createOrderTotal(label: string, amount: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.1) 100%); border: 2px solid #10B981; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-weight: 600; color: #10B981; font-size: 16px;">${label}</td>
              <td align="right" style="font-family: 'Courier New', monospace; font-weight: 700; color: #10B981; font-size: 22px;">${amount}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

/**
 * Stats card component - Ukraine themed for displaying key metrics
 */
export function createStatsCard(
  value: string,
  label: string,
  color: 'blue' | 'green' | 'gold' = 'blue'
): string {
  const gradients = {
    blue: 'linear-gradient(135deg, #076CB3 0%, #065A96 100%)',
    green: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    gold: 'linear-gradient(135deg, #F5B800 0%, #D19A00 100%)',
  }

  const textColors = {
    blue: '#ffffff',
    green: '#ffffff',
    gold: '#02263E',
  }

  return `
    <td style="padding: 6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background: ${gradients[color]}; border-radius: 16px;">
        <tr>
          <td style="padding: 20px 12px; text-align: center;">
            <div style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; color: ${textColors[color]};">${value}</div>
            <div style="font-size: 12px; color: ${color === 'gold' ? 'rgba(2,38,62,0.8)' : 'rgba(255,255,255,0.9)'}; margin-top: 4px; font-weight: 600;">${label}</div>
          </td>
        </tr>
      </table>
    </td>
  `
}
