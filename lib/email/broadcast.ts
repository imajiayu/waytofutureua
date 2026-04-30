import { logger } from '@/lib/logger'

import { getFromEmail, resend } from './client'
import { EmailTemplate, loadTemplateContent, replaceTemplateVariables } from './templates'

interface BroadcastEmailParams {
  template: EmailTemplate
  locale: 'en' | 'zh' | 'ua'
  recipients: string[]
  variables?: Record<string, string>
}

interface BroadcastResult {
  successCount: number
  failureCount: number
  errors: Array<{ email: string; error: string }>
}

// Resend's batch API accepts up to 100 messages per request
const BATCH_SIZE = 100

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

/**
 * 群发邮件给指定语言的订阅者。
 *
 * 采用 Resend Batch API 批量投递（每批最多 100 封，permissive 模式）。
 * 每个收件人依然拿到独立渲染的正文（含 per-recipient unsubscribe URL 和 List-Unsubscribe 头）。
 */
export async function sendBroadcastEmail(params: BroadcastEmailParams): Promise<BroadcastResult> {
  const { template, locale, recipients, variables = {} } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const content = loadTemplateContent(template.fileName)
  if (!content) {
    throw new Error(`Failed to load template content: ${template.fileName}`)
  }

  const subject = template.subject[locale]
  const htmlContent = content[locale]

  const projectId = template.projectId
  const projectUrl = projectId
    ? `${appUrl}/${locale}/donate?project=${projectId}`
    : `${appUrl}/${locale}/donate`

  const defaultVariables: Record<string, string> = {
    donate_url: `${appUrl}/${locale}/donate`,
    project_url: projectUrl,
    app_url: appUrl,
    ...variables,
  }

  const broadcastAddress = process.env.RESEND_BROADCAST_FROM_EMAIL || process.env.RESEND_FROM_EMAIL!
  const from = getFromEmail(locale, broadcastAddress)

  let successCount = 0
  let failureCount = 0
  const errors: Array<{ email: string; error: string }> = []

  for (const batch of chunk(recipients, BATCH_SIZE)) {
    const payload = batch.map((email) => {
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&locale=${locale}`
      const html = replaceTemplateVariables(htmlContent, {
        ...defaultVariables,
        unsubscribe_url: unsubscribeUrl,
      })
      return {
        from,
        to: email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    try {
      const { data, error } = await resend.batch.send(payload, {
        batchValidation: 'permissive',
      })

      if (error) {
        // Entire batch rejected — treat every address in it as failed
        failureCount += batch.length
        batch.forEach((email) => {
          errors.push({ email, error: error.message })
        })
        logger.error('EMAIL', 'Broadcast batch rejected', {
          error: error.message,
          batchSize: batch.length,
        })
        continue
      }

      const accepted = data?.data?.length ?? 0
      const perItemErrors = data?.errors ?? []

      successCount += accepted
      failureCount += perItemErrors.length

      for (const e of perItemErrors) {
        const email = batch[e.index]
        if (email) {
          errors.push({ email, error: e.message })
        }
      }

      logger.info('EMAIL', 'Broadcast batch sent', {
        batchSize: batch.length,
        accepted,
        rejected: perItemErrors.length,
      })
    } catch (err) {
      failureCount += batch.length
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      batch.forEach((email) => {
        errors.push({ email, error: errorMessage })
      })
      logger.errorWithStack('EMAIL', 'Broadcast batch threw', err)
    }
  }

  if (errors.length > 0) {
    logger.error('EMAIL', 'Broadcast email errors', {
      errorCount: errors.length,
      errors,
    })
  }

  return {
    successCount,
    failureCount,
    errors,
  }
}
