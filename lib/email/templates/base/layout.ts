/**
 * Base Email Layout - Ukraine Humanitarian Theme
 *
 * Design Language:
 * - Deep Ukraine blue gradient background (trust, peace, sky)
 * - Gold accents for highlights and CTAs (hope, wheat fields)
 * - Clean, warm typography with Georgia for headings
 *
 * Uses inline styles for maximum email client compatibility
 */

import type { AppLocale } from '@/types'

import { createFooter, createHeader } from './components'

interface EmailLayoutParams {
  title: string
  content: string
  locale: AppLocale
  badge?: string // Optional badge text above title
  subtitle?: string // Optional subtitle below title
}

/**
 * Create complete email HTML with base layout
 * Uses table-based layout with inline styles for email client compatibility
 */
export function createEmailLayout({
  title,
  content,
  locale,
  badge,
  subtitle,
}: EmailLayoutParams): string {
  const fontFamily =
    locale === 'zh'
      ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${fontFamily}; background-color: #02263E;">
  <!-- Ukraine-themed gradient: deep blue to navy -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #054878 0%, #04375B 50%, #02263E 100%); padding: 40px 20px;">
    <tr>
      <td align="center">
        <!-- Main container with subtle blue glass effect -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: rgba(7,108,179,0.05); border-radius: 24px; overflow: hidden; border: 1px solid rgba(7,108,179,0.3);">

          ${createHeader(title, locale, badge, subtitle)}

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 24px;">
              ${content}
            </td>
          </tr>

          ${createFooter(locale)}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
