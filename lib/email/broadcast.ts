import { Resend } from 'resend'
import { EmailTemplate, loadTemplateContent, replaceTemplateVariables } from './templates'
import { getFromEmail } from './client'
import { logger } from '@/lib/logger'

const resend = new Resend(process.env.RESEND_API_KEY)

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

/**
 * 群发邮件给指定语言的订阅者
 * @param params - 群发参数
 * @returns 发送结果统计
 */
export async function sendBroadcastEmail(
  params: BroadcastEmailParams
): Promise<BroadcastResult> {
  const { template, locale, recipients, variables = {} } = params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // 加载邮件内容（使用 fileName 作为文件夹名）
  const content = loadTemplateContent(template.fileName)
  if (!content) {
    throw new Error(`Failed to load template content: ${template.fileName}`)
  }

  // 获取对应语言的主题和内容
  const subject = template.subject[locale]
  let htmlContent = content[locale]

  // 构建 project_url（如果提供了 projectId）
  const projectId = template.projectId
  const projectUrl = projectId
    ? `${appUrl}/${locale}/donate?project=${projectId}`
    : `${appUrl}/${locale}/donate`

  // 默认变量（如果未提供）
  const defaultVariables: Record<string, string> = {
    donate_url: `${appUrl}/${locale}/donate`,
    project_url: projectUrl,
    app_url: appUrl,
    ...variables,
  }

  let successCount = 0
  let failureCount = 0
  const errors: Array<{ email: string; error: string }> = []

  // 串行发送邮件，每封之间添加延迟避免 Resend rate limit (3 req/s)
  // 使用 500ms 延迟确保稳定性
  const DELAY_BETWEEN_EMAILS_MS = 500

  for (let i = 0; i < recipients.length; i++) {
    const email = recipients[i]

    try {
      // 为每个收件人生成唯一的取消订阅链接
      const unsubscribeUrl = `${appUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&locale=${locale}`

      // 替换模板变量
      const personalizedVariables = {
        ...defaultVariables,
        unsubscribe_url: unsubscribeUrl,
      }
      const personalizedHtml = replaceTemplateVariables(htmlContent, personalizedVariables)

      // 发送邮件（群发使用专用地址，未配置时回退到默认地址）
      const broadcastAddress = process.env.RESEND_BROADCAST_FROM_EMAIL || process.env.RESEND_FROM_EMAIL!
      const { data, error } = await resend.emails.send({
        from: getFromEmail(locale, broadcastAddress),
        to: email,
        subject: subject,
        html: personalizedHtml,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      })

      // Resend SDK 不会 reject，而是返回 { data, error }
      if (error) {
        throw new Error(error.message)
      }

      successCount++
      logger.info('EMAIL', `Broadcast email sent (${i + 1}/${recipients.length})`, { email })
    } catch (err) {
      failureCount++
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      errors.push({ email, error: errorMessage })
      logger.error('EMAIL', `Failed to send broadcast email to ${email}`, { error: errorMessage })
    }

    // 添加延迟（最后一封不需要）
    if (i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS))
    }
  }

  // 打印错误日志（如果有）
  if (errors.length > 0) {
    logger.error('EMAIL', 'Broadcast email errors', { errorCount: errors.length, errors })
  }

  return {
    successCount,
    failureCount,
    errors,
  }
}
