/**
 * Resend Email Client
 */

import { Resend } from 'resend'

import { ORG_BRANDING } from './config'
import type { Locale } from './types'
import { getLocalizedText } from './utils'

// Lazy initialization to allow dotenv to load first
let _resend: Resend | null = null

function getResendClient(): Resend {
  if (_resend) return _resend

  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set')
  }

  _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export const resend = new Proxy({} as Resend, {
  get(target, prop) {
    const client = getResendClient()
    const value = client[prop as keyof Resend]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

const DEFAULT_FROM_ADDRESS = 'noreply@waytofutureua.org.ua'

/**
 * Build RFC 5322 formatted From header with localized display name.
 * Example: `WAY TO FUTURE UA <noreply@waytofutureua.org.ua>`
 */
export function getFromEmail(
  locale: Locale,
  address: string = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_ADDRESS
): string {
  const displayName = getLocalizedText(ORG_BRANDING.name, locale)
  return `${displayName} <${address}>`
}
