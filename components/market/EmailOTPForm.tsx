'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { sendOTP, verifyOTP } from '@/app/actions/market-auth'
import { SpinnerIcon } from '@/components/icons'

interface EmailOTPFormProps {
  onSuccess: () => void
  onCancel?: () => void
  /** 预填邮箱 */
  defaultEmail?: string
  /** 是否显示为紧凑模式（内嵌在其他表单中） */
  compact?: boolean
  /** 深色主题（用于深色背景上，无需卡片包裹） */
  dark?: boolean
}

const COOLDOWN_SECONDS = 60

// ── 主题样式 ──────────────────────────────────────
const LIGHT = {
  label: 'block text-sm font-medium text-gray-700 mb-1',
  input:
    'w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400',
  codeInput:
    'w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl tracking-[0.5em] font-mono text-gray-900 focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400',
  button:
    'w-full py-3 bg-ukraine-gold-500 text-ukraine-blue-900 rounded-lg font-bold hover:bg-ukraine-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-ukraine-gold-500/20 flex items-center justify-center gap-2',
  link: 'text-ukraine-blue-500 hover:text-ukraine-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors',
  muted: 'text-gray-500 hover:text-gray-700 transition-colors',
  hint: 'text-sm text-gray-600',
  cancel: 'w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors',
  emailBadge:
    'flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg',
  emailText: 'text-sm text-gray-700 font-medium truncate',
  divider: 'border-t border-gray-100',
}

const DARK = {
  label: 'block text-sm font-medium text-white/80 mb-1',
  input:
    'w-full px-4 py-3 bg-white/10 border border-white/15 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-ukraine-gold-400/50 focus:border-transparent disabled:opacity-50',
  codeInput:
    'w-full px-4 py-3 bg-white/10 border border-white/15 rounded-lg text-center text-2xl tracking-[0.5em] font-mono text-white placeholder:text-white/40 focus:ring-2 focus:ring-ukraine-gold-400/50 focus:border-transparent disabled:opacity-50',
  button:
    'w-full py-3 bg-ukraine-gold-500 text-ukraine-blue-900 rounded-lg font-bold hover:bg-ukraine-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-ukraine-gold-500/20 flex items-center justify-center gap-2',
  link: 'text-ukraine-gold-300/80 hover:text-ukraine-gold-200 disabled:text-white/30 disabled:cursor-not-allowed transition-colors',
  muted: 'text-white/50 hover:text-white/70 transition-colors',
  hint: 'text-sm text-white/60',
  cancel: 'w-full py-2 text-sm text-white/40 hover:text-white/70 transition-colors',
  emailBadge:
    'flex items-center justify-between gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg',
  emailText: 'text-sm text-white/80 font-medium truncate',
  divider: 'border-t border-white/10',
}

export default function EmailOTPForm({
  onSuccess,
  onCancel,
  defaultEmail = '',
  compact = false,
  dark = false,
}: EmailOTPFormProps) {
  const t = useTranslations('market.auth')
  const s = dark ? DARK : LIGHT

  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // 渐进式流程状态
  const [sentEmail, setSentEmail] = useState('') // 已发送验证码的邮箱
  const [isEditingEmail, setIsEditingEmail] = useState(false)

  const codeInputRef = useRef<HTMLInputElement>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasSentCode = sentEmail !== ''
  const emailMatchesSent = email.trim().toLowerCase() === sentEmail

  // 倒计时
  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return

    setIsLoading(true)
    setError(null)

    const result = await sendOTP(trimmed)

    setIsLoading(false)

    if (!result.success) {
      const errorMap: Record<string, string> = {
        rate_limited: t('rateLimited'),
        invalid_email: t('invalidEmail'),
        send_failed: t('sendFailed'),
      }
      setError(errorMap[result.error || ''] || t('sendFailed'))
      if (result.error === 'rate_limited') startCooldown()
      return
    }

    setSentEmail(trimmed)
    setIsEditingEmail(false)
    setCode('')
    startCooldown()

    requestAnimationFrame(() => codeInputRef.current?.focus())
  }

  const handleVerifyCode = async () => {
    const trimmedCode = code.trim()
    if (trimmedCode.length !== 6) return

    setIsLoading(true)
    setError(null)

    const result = await verifyOTP(sentEmail, trimmedCode)

    setIsLoading(false)

    if (!result.success) {
      const errorMap: Record<string, string> = {
        code_expired: t('codeExpired'),
        invalid_code: t('invalidCode'),
        rate_limited: t('rateLimited'),
        verify_failed: t('verifyFailed'),
      }
      setError(errorMap[result.error || ''] || t('verifyFailed'))
      return
    }

    onSuccess()
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError(null)
    setCode('')
    setEmail(sentEmail)
    setIsLoading(true)

    const result = await sendOTP(sentEmail)
    setIsLoading(false)

    if (!result.success) {
      const errorMap: Record<string, string> = {
        rate_limited: t('rateLimited'),
        send_failed: t('sendFailed'),
      }
      setError(errorMap[result.error || ''] || t('sendFailed'))
      if (result.error === 'rate_limited') startCooldown()
      return
    }

    setCode('')
    startCooldown()
    requestAnimationFrame(() => codeInputRef.current?.focus())
  }

  const containerClass = compact
    ? 'space-y-4'
    : 'p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4'

  return (
    <div className={containerClass}>
      {!compact && (
        <div className="mb-2 text-center">
          <h3 className="font-display text-lg font-bold text-gray-900">{t('title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-warm-200 bg-warm-50 p-3 text-sm text-warm-700"
        >
          {error}
        </div>
      )}

      {!hasSentCode ? (
        /* ══ 初始阶段：邮箱输入 + 发送 ══ */
        <div className="space-y-3">
          <div>
            <label htmlFor="otp-email" className={s.label}>
              {t('enterEmail')}
            </label>
            <input
              id="otp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
              placeholder="email@example.com"
              disabled={isLoading}
              className={s.input}
              autoComplete="email"
            />
          </div>

          <button
            onClick={handleSendCode}
            disabled={isLoading || !email.trim()}
            className={s.button}
          >
            {isLoading && <SpinnerIcon className="h-4 w-4 animate-spin" />}
            {t('sendCode')}
          </button>
        </div>
      ) : (
        /* ══ 验证阶段：邮箱展示/编辑 + 验证码输入 ══ */
        <div className="space-y-3">
          {/* ── 邮箱区域 ── */}
          {isEditingEmail ? (
            /* 编辑模式 */
            <div className="space-y-2">
              <div>
                <label htmlFor="otp-email-edit" className={s.label}>
                  {t('enterEmail')}
                </label>
                <input
                  id="otp-email-edit"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !emailMatchesSent && handleSendCode()}
                  placeholder="email@example.com"
                  disabled={isLoading}
                  className={s.input}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {emailMatchesSent ? (
                /* 同一邮箱 → 纯文本提示 */
                <p className={s.hint}>{t('codeSent', { email: sentEmail })}</p>
              ) : (
                /* 不同邮箱 → 发送新验证码 */
                <button
                  onClick={handleSendCode}
                  disabled={isLoading || !email.trim()}
                  className={s.button}
                >
                  {isLoading && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                  {t('sendCode')}
                </button>
              )}
            </div>
          ) : (
            /* 紧凑展示模式 */
            <div className={s.emailBadge}>
              <div className="flex min-w-0 items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                  />
                </svg>
                <span className={s.emailText}>{sentEmail}</span>
              </div>
              <button
                onClick={() => {
                  setIsEditingEmail(true)
                  setError(null)
                }}
                disabled={isLoading}
                className={`flex-shrink-0 text-sm ${s.muted}`}
              >
                {t('changeEmail')}
              </button>
            </div>
          )}

          {/* ── 验证码区域 — 邮箱匹配时始终可见 ── */}
          {emailMatchesSent && (
            <>
              <div className={`pt-1 ${s.divider}`} />

              <div>
                <label htmlFor="otp-code" className={s.label}>
                  {t('enterCode')}
                </label>
                <input
                  ref={codeInputRef}
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                  placeholder="000000"
                  disabled={isLoading}
                  className={s.codeInput}
                  autoComplete="one-time-code"
                />
              </div>

              <button
                onClick={handleVerifyCode}
                disabled={isLoading || code.trim().length !== 6}
                className={s.button}
              >
                {isLoading && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                {t('verify')}
              </button>

              {/* 重发 */}
              <div className="text-center text-sm">
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || isLoading}
                  className={s.link}
                >
                  {cooldown > 0 ? t('resendIn', { seconds: cooldown }) : t('resend')}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 取消按钮 */}
      {onCancel && (
        <button onClick={onCancel} className={s.cancel}>
          {t('cancel')}
        </button>
      )}
    </div>
  )
}
