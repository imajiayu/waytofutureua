'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { sendOTP, verifyOTP } from '@/app/actions/market-auth'
import { SpinnerIcon } from '@/components/icons'

interface EmailOTPFormProps {
  onSuccess: () => void
  onCancel?: () => void
  /** 预填邮箱 */
  defaultEmail?: string
  /** 是否显示为紧凑模式（内嵌在其他表单中） */
  compact?: boolean
}

type Step = 'email' | 'code'

const COOLDOWN_SECONDS = 60

export default function EmailOTPForm({
  onSuccess,
  onCancel,
  defaultEmail = '',
  compact = false,
}: EmailOTPFormProps) {
  const t = useTranslations('market.auth')

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState(defaultEmail)
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const codeInputRef = useRef<HTMLInputElement>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 倒计时
  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS)
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
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
    const trimmed = email.trim()
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

    setStep('code')
    setCode('')
    startCooldown()

    // 自动聚焦验证码输入框
    requestAnimationFrame(() => codeInputRef.current?.focus())
  }

  const handleVerifyCode = async () => {
    const trimmedCode = code.trim()
    if (trimmedCode.length !== 6) return

    setIsLoading(true)
    setError(null)

    const result = await verifyOTP(email.trim(), trimmedCode)

    setIsLoading(false)

    if (!result.success) {
      const errorMap: Record<string, string> = {
        code_expired: t('codeExpired'),
        invalid_code: t('invalidCode'),
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
    await handleSendCode()
  }

  const containerClass = compact
    ? 'space-y-4'
    : 'p-6 bg-white rounded-xl border border-gray-200 shadow-sm space-y-4'

  return (
    <div className={containerClass}>
      {!compact && (
        <div className="text-center mb-2">
          <h3 className="text-lg font-bold text-gray-900 font-display">
            {t('title')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('subtitle')}
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-warm-50 border border-warm-200 rounded-lg text-sm text-warm-700">
          {error}
        </div>
      )}

      {step === 'email' ? (
        /* 邮箱输入阶段 */
        <div className="space-y-3">
          <div>
            <label htmlFor="otp-email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('enterEmail')}
            </label>
            <input
              id="otp-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendCode()}
              placeholder="email@example.com"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900
                       focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent
                       disabled:bg-gray-50 disabled:text-gray-400"
              autoComplete="email"
            />
          </div>

          <button
            onClick={handleSendCode}
            disabled={isLoading || !email.trim()}
            className="w-full py-3 bg-ukraine-blue-500 text-white rounded-lg font-semibold
                     hover:bg-ukraine-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <SpinnerIcon className="animate-spin h-4 w-4" />}
            {t('sendCode')}
          </button>
        </div>
      ) : (
        /* 验证码输入阶段 */
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {t('codeSent', { email: email.trim() })}
          </p>

          <div>
            <label htmlFor="otp-code" className="block text-sm font-medium text-gray-700 mb-1">
              {t('enterCode')}
            </label>
            <input
              ref={codeInputRef}
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
              placeholder="000000"
              disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl
                       tracking-[0.5em] font-mono text-gray-900
                       focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent
                       disabled:bg-gray-50 disabled:text-gray-400"
              autoComplete="one-time-code"
            />
          </div>

          <button
            onClick={handleVerifyCode}
            disabled={isLoading || code.trim().length !== 6}
            className="w-full py-3 bg-ukraine-blue-500 text-white rounded-lg font-semibold
                     hover:bg-ukraine-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2"
          >
            {isLoading && <SpinnerIcon className="animate-spin h-4 w-4" />}
            {t('verify')}
          </button>

          {/* 重发 & 返回 */}
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || isLoading}
              className="text-ukraine-blue-500 hover:text-ukraine-blue-700 disabled:text-gray-400
                       disabled:cursor-not-allowed transition-colors"
            >
              {cooldown > 0 ? t('resendIn', { seconds: cooldown }) : t('resend')}
            </button>

            <button
              onClick={() => { setStep('email'); setCode(''); setError(null) }}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {t('changeEmail')}
            </button>
          </div>
        </div>
      )}

      {/* 取消按钮 */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {t('cancel')}
        </button>
      )}
    </div>
  )
}
