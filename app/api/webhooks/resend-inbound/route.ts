import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import sanitizeHtml from 'sanitize-html'
import { Resend, type Attachment } from 'resend'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'
// 附件下载 + 上行 send 总耗时保守取 60s，避免大邮件时 Vercel 函数默认 timeout 中断
export const maxDuration = 60

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SELF_DOMAIN = 'waytofutureua.org.ua'
const FROM_DISPLAY_NAME = 'Way to Future UA'
const DEFAULT_FROM_ADDRESS = `noreply@${SELF_DOMAIN}`
const DEFAULT_FORWARD_TO = 'majiayu110@gmail.com'
const FORWARDED_PREFIX = '[Forwarded]'
// 出站 header 里打标 + 入站读原邮件 headers 时识别，防我们自己转发出去的邮件被对方反弹/自动回复又绕回到入站 webhook
const FORWARD_MARK_HEADER = 'X-Forwarded-By'
const FORWARD_MARK_VALUE = SELF_DOMAIN
const ATTACHMENT_DOWNLOAD_TIMEOUT_MS = 20_000
// Resend 单封邮件 40MB 上限；附件总量保险线设 30MB，超过就丢尾部，避免 send 整封失败
const ATTACHMENT_TOTAL_LIMIT_BYTES = 30 * 1024 * 1024

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function joinAddresses(value: unknown): string | null {
  if (Array.isArray(value)) {
    const parts = value.filter((v): v is string => typeof v === 'string' && v.length > 0)
    return parts.length > 0 ? parts.join(', ') : null
  }
  if (typeof value === 'string' && value.length > 0) return value
  return null
}

function sanitizeHeader(value: string, maxLen: number): string {
  return value.replace(/[\r\n]+/g, ' ').slice(0, maxLen)
}

function extractEmailAddress(value: string): string | null {
  const angle = value.match(/<([^>\s]+@[^>\s]+)>/)
  if (angle) return angle[1].toLowerCase()
  const trimmed = value.trim().toLowerCase()
  return EMAIL_RE.test(trimmed) ? trimmed : null
}

function isSelfDomainSender(rawFrom: string): boolean {
  const addr = extractEmailAddress(rawFrom)
  if (!addr) return false
  const at = addr.lastIndexOf('@')
  if (at < 0) return false
  const domain = addr.slice(at + 1)
  return domain === SELF_DOMAIN || domain.endsWith('.' + SELF_DOMAIN)
}

function hasForwardMarkHeader(headers: Record<string, string> | null | undefined): boolean {
  if (!headers) return false
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === FORWARD_MARK_HEADER.toLowerCase()) {
      return typeof v === 'string' && v.toLowerCase().includes(FORWARD_MARK_VALUE.toLowerCase())
    }
  }
  return false
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
}

type SvixPayload = { type?: string; data?: Record<string, unknown> }

function isSvixPayload(v: unknown): v is SvixPayload {
  if (typeof v !== 'object' || v === null) return false
  const obj = v as Record<string, unknown>
  if (obj.type !== undefined && typeof obj.type !== 'string') return false
  if (obj.data !== undefined && (typeof obj.data !== 'object' || obj.data === null)) return false
  return true
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'h1',
    'h2',
    'center',
    'font',
    'span',
    'u',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['style', 'class', 'align', 'lang', 'dir', 'title', 'width', 'height'],
    img: ['src', 'alt', 'width', 'height', 'style'],
    a: ['href', 'name', 'target', 'rel', 'title', 'style'],
    font: ['color', 'size', 'face'],
    td: ['colspan', 'rowspan', 'align', 'valign', 'style', 'width', 'height'],
    th: ['colspan', 'rowspan', 'align', 'valign', 'style', 'width', 'height'],
    table: ['align', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'style', 'width'],
  },
  // cid: 让入站 HTML 里的 <img src="cid:xxx"> 引用得以保留；发件时对应附件带 contentId 即可渲染 inline 图片
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data', 'cid'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
}

type InboundAttachmentMeta = {
  id: string
  filename: string | null
  size: number
  content_type: string
  content_id: string | null
  content_disposition: string | null
}

type FetchedAttachment = {
  filename: string
  contentType: string
  contentBase64: string
  contentId?: string
  size: number
}

// Resend `emails.receiving.get` 返回的 attachments[] 是 metadata，必须再 /attachments/{id} 拿一次签名 URL 再下载
async function downloadAttachment(
  emailId: string,
  meta: InboundAttachmentMeta,
): Promise<FetchedAttachment | null> {
  const detail = await resend.emails.receiving.attachments.get({ emailId, id: meta.id })
  if (detail.error || !detail.data?.download_url) {
    logger.warn('WEBHOOK:RESEND', 'Failed to get attachment download URL', {
      attachmentId: meta.id,
      filename: meta.filename,
      error: detail.error,
    })
    return null
  }
  try {
    const res = await fetchWithTimeout(detail.data.download_url, ATTACHMENT_DOWNLOAD_TIMEOUT_MS)
    if (!res.ok) {
      logger.warn('WEBHOOK:RESEND', 'Attachment download non-2xx', {
        attachmentId: meta.id,
        filename: meta.filename,
        status: res.status,
      })
      return null
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const cid = meta.content_id ? meta.content_id.replace(/^<|>$/g, '') : undefined
    return {
      filename: meta.filename || `attachment-${meta.id}`,
      contentType: meta.content_type || detail.data.content_type || 'application/octet-stream',
      contentBase64: buf.toString('base64'),
      contentId: cid,
      size: buf.byteLength,
    }
  } catch (err) {
    logger.warn('WEBHOOK:RESEND', 'Attachment download threw (timeout / network)', {
      attachmentId: meta.id,
      filename: meta.filename,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

function toResendAttachments(fetched: FetchedAttachment[]): {
  attachments: Attachment[]
  sizeCapDropped: number
} {
  // 逐个累加，超过 30MB 保险线就停止（剩余丢日志里），避免 send 整封 40MB 限制触发失败
  const out: Attachment[] = []
  let total = 0
  let sizeCapDropped = 0
  for (const a of fetched) {
    if (total + a.size > ATTACHMENT_TOTAL_LIMIT_BYTES) {
      logger.warn('WEBHOOK:RESEND', 'Attachment total exceeds 30MB cap, dropping rest', {
        skippedFilename: a.filename,
        skippedSize: a.size,
        alreadyTotal: total,
      })
      sizeCapDropped++
      continue
    }
    total += a.size
    out.push({
      filename: a.filename,
      content: a.contentBase64,
      contentType: a.contentType,
      contentId: a.contentId,
    })
  }
  return { attachments: out, sizeCapDropped }
}

function buildMetaBlockHtml(params: {
  from: string
  to: string
  cc: string | null
  subject: string
  date: string | null
}): string {
  const { from, to, cc, subject, date } = params
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;border-left:3px solid #006CB2;padding:14px 18px;border-radius:6px;margin:0 0 20px;color:#374151;font-size:13px;line-height:1.6;">
  <div style="font-weight:600;color:#111827;margin-bottom:8px;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">Forwarded from ${escapeHtml(SELF_DOMAIN)}</div>
  <div><span style="color:#6b7280;">From:</span> ${escapeHtml(from)}</div>
  <div><span style="color:#6b7280;">To:</span> ${escapeHtml(to)}</div>
  ${cc ? `<div><span style="color:#6b7280;">Cc:</span> ${escapeHtml(cc)}</div>` : ''}
  <div><span style="color:#6b7280;">Subject:</span> ${escapeHtml(subject)}</div>
  ${date ? `<div><span style="color:#6b7280;">Date:</span> ${escapeHtml(date)}</div>` : ''}
</div>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
`.trim()
}

function buildMetaBlockText(params: {
  from: string
  to: string
  cc: string | null
  subject: string
  date: string | null
}): string {
  const { from, to, cc, subject, date } = params
  return [
    `--- Forwarded from ${SELF_DOMAIN} ---`,
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${subject}`,
    date ? `Date: ${date}` : null,
    '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildFromAddress(): string {
  const address = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_ADDRESS
  return `${FROM_DISPLAY_NAME} <${address}>`
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  const forwardTo = process.env.FORWARD_TO_EMAIL || DEFAULT_FORWARD_TO

  if (!webhookSecret) {
    logger.error('WEBHOOK:RESEND', 'RESEND_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const rawBody = await req.text()
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }

  let verified: unknown
  try {
    verified = new Webhook(webhookSecret).verify(rawBody, svixHeaders)
  } catch (err) {
    logger.warn('WEBHOOK:RESEND', 'svix signature verification failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  if (!isSvixPayload(verified)) {
    logger.warn('WEBHOOK:RESEND', 'Payload structure unexpected')
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (verified.type !== 'email.received' || !verified.data) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const metaData = verified.data as Record<string, unknown>
  const emailId = typeof metaData.email_id === 'string' ? metaData.email_id : null
  const metaFrom = typeof metaData.from === 'string' ? metaData.from : ''
  const metaSubject = typeof metaData.subject === 'string' ? metaData.subject : ''

  // 断循环层 1：发件人是我们自己域名（含子域）——我们转发出去的邮件如果被对端 bounce / auto-reply 绕回来，基本上 from 仍会是我们的域名
  if (metaFrom && isSelfDomainSender(metaFrom)) {
    logger.info('WEBHOOK:RESEND', 'Skip self-domain sender (loop guard)', { from: metaFrom })
    return NextResponse.json({ ok: true, skipped: 'self-domain sender' })
  }

  // 断循环层 2：subject 含 [Forwarded] 标记——bounce / auto-reply 经常会前置 Re: / Fwd:，所以用 includes 不用 startsWith
  if (metaSubject.includes(FORWARDED_PREFIX)) {
    logger.info('WEBHOOK:RESEND', 'Skip already-forwarded email (subject prefix)', {
      subject: metaSubject.slice(0, 80),
    })
    return NextResponse.json({ ok: true, skipped: 'already forwarded' })
  }

  if (!emailId) {
    logger.error('WEBHOOK:RESEND', 'Payload missing email_id, cannot fetch body')
    return NextResponse.json({ error: 'Missing email_id' }, { status: 400 })
  }

  // Resend webhook payload 只给 metadata，正文 html / text / attachments 必须用 email_id 反查 /emails/receiving/{id}
  const fetched = await resend.emails.receiving.get(emailId)
  if (fetched.error || !fetched.data) {
    logger.error('WEBHOOK:RESEND', 'Fetch inbound email body failed', {
      emailId,
      error: fetched.error,
    })
    return NextResponse.json({ error: 'Fetch body failed' }, { status: 502 })
  }

  const detail = fetched.data

  // 断循环层 3：原邮件 headers 里带 X-Forwarded-By: waytofutureua.org.ua（我们自己发出去时打的标）
  if (hasForwardMarkHeader(detail.headers)) {
    logger.info('WEBHOOK:RESEND', 'Skip email with X-Forwarded-By mark (loop guard)')
    return NextResponse.json({ ok: true, skipped: 'forwarded mark header' })
  }

  const rawFrom = detail.from ?? metaFrom ?? ''
  const from = rawFrom || '(unknown sender)'
  const subject = sanitizeHeader(detail.subject ?? metaSubject ?? '(No Subject)', 200)
  const toLine = joinAddresses(detail.to) ?? '(unknown)'
  const ccLine = joinAddresses(detail.cc)
  const dateLine = detail.created_at ? new Date(detail.created_at).toUTCString() : null
  const htmlBody = detail.html ?? ''
  const textBody = detail.text ?? ''

  const safeHtml = htmlBody ? sanitizeHtml(htmlBody, SANITIZE_OPTIONS) : ''
  const safeReplyTo = EMAIL_RE.test(rawFrom)
    ? rawFrom
    : extractEmailAddress(rawFrom) ?? undefined

  // 附件并行下载；单个失败不阻塞其他附件和正文转发
  const inboundAttachments = Array.isArray(detail.attachments)
    ? (detail.attachments as InboundAttachmentMeta[])
    : []
  const downloaded = (
    await Promise.all(inboundAttachments.map((m) => downloadAttachment(emailId, m)))
  ).filter((a): a is FetchedAttachment => a !== null)
  const attachmentFetchFailed = inboundAttachments.length - downloaded.length
  const { attachments: outgoingAttachments, sizeCapDropped: attachmentSizeCapDropped } =
    toResendAttachments(downloaded)

  const metaHtml = buildMetaBlockHtml({
    from,
    to: toLine,
    cc: ccLine,
    subject,
    date: dateLine,
  })
  const metaText = buildMetaBlockText({
    from,
    to: toLine,
    cc: ccLine,
    subject,
    date: dateLine,
  })

  const finalHtml = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:720px;margin:0 auto;">
  ${metaHtml}
  ${safeHtml || `<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">${escapeHtml(textBody || '(No content)')}</pre>`}
</div>
`.trim()

  const finalText = `${metaText}\n${textBody || '(No content)'}`

  try {
    const result = await resend.emails.send({
      from: buildFromAddress(),
      to: forwardTo,
      replyTo: safeReplyTo,
      subject: `${FORWARDED_PREFIX} ${subject}`,
      html: finalHtml,
      text: finalText,
      attachments: outgoingAttachments.length > 0 ? outgoingAttachments : undefined,
      headers: {
        [FORWARD_MARK_HEADER]: FORWARD_MARK_VALUE,
        'X-Original-Email-Id': emailId,
      },
    })

    if (result.error) {
      logger.error('WEBHOOK:RESEND', 'Resend forward failed', {
        emailId,
        error: result.error,
      })
      return NextResponse.json({ ok: false, error: 'Forward failed' }, { status: 502 })
    }

    logger.info('WEBHOOK:RESEND', 'Email forwarded successfully', {
      emailId,
      messageId: result.data?.id,
      forwardedTo: forwardTo,
      attachmentCount: outgoingAttachments.length,
      attachmentFetchFailed,
      attachmentSizeCapDropped,
    })

    return NextResponse.json({
      ok: true,
      messageId: result.data?.id,
      attachmentCount: outgoingAttachments.length,
      attachmentFetchFailed,
      attachmentSizeCapDropped,
    })
  } catch (err) {
    logger.errorWithStack('WEBHOOK:RESEND', 'Forward threw', err)
    return NextResponse.json({ ok: false, error: 'Forward threw' }, { status: 500 })
  }
}
