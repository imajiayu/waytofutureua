/**
 * i18n Utilities for Project Data
 *
 * Helper functions to extract translated text from i18n JSON fields and format dates.
 */

import type { AppLocale, I18nText, Json } from '@/types'

type I18nInput = I18nText | Json | undefined | null

/**
 * Get translated text from an i18n object. Falls back to English, then to `fallbackText`.
 */
export function getTranslatedText(
  i18nText: I18nInput,
  fallbackText: string | null,
  locale: AppLocale = 'en'
): string {
  if (!i18nText || typeof i18nText !== 'object' || Array.isArray(i18nText)) {
    return fallbackText || ''
  }
  const i18n = i18nText as Record<string, unknown>
  const value = i18n[locale] ?? i18n.en
  return typeof value === 'string' ? value : fallbackText || ''
}

const JS_LOCALE_MAP: Record<AppLocale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  ua: 'uk-UA',
}

/**
 * Format a date with proper locale support (date only, UTC time zone).
 */
export function formatDate(
  dateString: string | null | undefined,
  locale: AppLocale = 'en',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString(JS_LOCALE_MAP[locale] ?? 'en-US', { timeZone: 'UTC', ...options })
}

/**
 * Format a date string with time for display.
 */
export function formatDateTime(
  dateString: string | null | undefined,
  locale: AppLocale = 'en',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString(JS_LOCALE_MAP[locale] ?? 'en-US', options)
}
