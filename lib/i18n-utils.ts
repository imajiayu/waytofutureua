/**
 * i18n Utilities for Project Data
 *
 * Helper functions to extract translated text from i18n JSON fields
 */

import type { I18nText, Json } from '@/types'

export type SupportedLocale = 'en' | 'zh' | 'ua'

// Accept both precise I18nText and database Json type for compatibility
type I18nInput = I18nText | Json | undefined | null

/**
 * Get translated text from i18n object
 * Falls back to English, then to fallback text
 *
 * @param i18nText - The i18n object with translations
 * @param fallbackText - Fallback text if no translation found
 * @param locale - Requested locale (en, zh, ua)
 * @returns Translated text
 */
export function getTranslatedText(
  i18nText: I18nInput,
  fallbackText: string | null,
  locale: SupportedLocale = 'en'
): string {
  // If no i18n object, return fallback
  if (!i18nText || typeof i18nText !== 'object' || Array.isArray(i18nText)) {
    return fallbackText || ''
  }

  // Cast to record type for safe indexing
  const i18n = i18nText as Record<string, any>

  // Try requested locale
  if (i18n[locale] && typeof i18n[locale] === 'string') {
    return i18n[locale]
  }

  // Fallback to English
  if (i18n.en && typeof i18n.en === 'string') {
    return i18n.en
  }

  // Final fallback
  return fallbackText || ''
}

/**
 * Helper to get project name in current locale
 */
export function getProjectName(
  projectNameI18n: I18nInput,
  fallbackName: string | null,
  locale: SupportedLocale = 'en'
): string {
  return getTranslatedText(projectNameI18n, fallbackName, locale)
}

/**
 * Helper to get location in current locale
 */
export function getLocation(
  locationI18n: I18nInput,
  fallbackLocation: string | null,
  locale: SupportedLocale = 'en'
): string {
  return getTranslatedText(locationI18n, fallbackLocation, locale)
}

/**
 * Helper to get unit name in current locale
 */
export function getUnitName(
  unitNameI18n: I18nInput,
  fallbackUnitName: string | null,
  locale: SupportedLocale = 'en'
): string {
  return getTranslatedText(unitNameI18n, fallbackUnitName, locale)
}

/**
 * Map application locale to JavaScript Intl API locale
 * (Internal function for formatDate)
 */
function getJsLocale(locale: SupportedLocale): string {
  const localeMap: Record<SupportedLocale, string> = {
    en: 'en-US',
    zh: 'zh-CN',
    ua: 'uk-UA' // Ukrainian locale code for JavaScript
  }
  return localeMap[locale] || 'en-US'
}

/**
 * Format date with proper locale support
 *
 * @param dateString - ISO date string or null
 * @param locale - Application locale (en, zh, ua)
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string or 'N/A'
 */
export function formatDate(
  dateString: string | null | undefined,
  locale: SupportedLocale = 'en',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString(getJsLocale(locale), options)
  } catch {
    return 'N/A'
  }
}

/**
 * Format a date string with time for display (uses toLocaleString)
 */
export function formatDateTime(
  dateString: string | null | undefined,
  locale: SupportedLocale = 'en',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleString(getJsLocale(locale), options)
  } catch {
    return 'N/A'
  }
}
