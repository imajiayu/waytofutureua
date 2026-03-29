/**
 * Email Utility Functions
 */

import { I18nText, Locale } from './types'

/**
 * Get localized text from i18n object
 */
export function getLocalizedText(i18nText: I18nText | null | undefined, locale: Locale): string {
  if (!i18nText) return ''
  return i18nText[locale] || i18nText.en || ''
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, char => map[char])
}

/**
 * Get tracking URL for donation
 */
export function getTrackingUrl(locale: Locale): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua'
  return `${baseUrl}/${locale}/track-donation`
}

/**
 * Get market orders URL for buyer
 */
export function getMarketOrdersUrl(locale: Locale): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua'
  return `${baseUrl}/${locale}/market/orders`
}
