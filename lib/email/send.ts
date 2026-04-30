import type { LogCategory } from '@/lib/logger'
import { logger } from '@/lib/logger'

import { getFromEmail, resend } from './client'
import type { Locale } from './types'

interface SendEmailParams {
  to: string
  locale: Locale
  subject: string
  html: string
  text: string
  category: LogCategory
  /** Human-readable label for log lines, e.g. 'payment success', 'order shipped' */
  label: string
  /** Extra fields appended to the success log */
  meta?: Record<string, unknown>
}

export async function sendEmail({
  to,
  locale,
  subject,
  html,
  text,
  category,
  label,
  meta,
}: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: getFromEmail(locale),
      to,
      subject,
      html,
      text,
    })

    if (error) {
      logger.error(category, `Error sending ${label} email`, { error: error.message })
      throw error
    }

    logger.info(category, `${label} email sent`, { messageId: data?.id, to, ...(meta ?? {}) })
    return data
  } catch (error) {
    logger.errorWithStack(category, `Failed to send ${label} email`, error)
    throw error
  }
}
