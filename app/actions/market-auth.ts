'use server'

import { headers } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// ============================================
// Market 模块 — 邮箱 OTP 认证
// 使用 Supabase Auth 内建的 Email OTP
// ============================================

// 速率限制配置
const SEND_LIMIT_PER_EMAIL  = { max: 10, window: 60 * 60 * 1000 } // 每 email 每小时 10 次
const SEND_LIMIT_PER_IP     = { max: 30, window: 60 * 60 * 1000 } // 每 IP 每小时 30 次
const VERIFY_LIMIT          = { max: 5,  window: 15 * 60 * 1000 } // 每 (email+IP) 15 分钟 5 次

async function getClientIP(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
}

export async function sendOTP(email: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { success: false, error: 'invalid_email' }
  }

  // 速率限制检查
  const ip = await getClientIP()
  if (!checkRateLimit(`otp-send:email:${trimmed}`, SEND_LIMIT_PER_EMAIL.max, SEND_LIMIT_PER_EMAIL.window)) {
    logger.warn('MARKET:AUTH', 'OTP send rate limited (email)', { email: trimmed })
    return { success: false, error: 'rate_limited' }
  }
  if (!checkRateLimit(`otp-send:ip:${ip}`, SEND_LIMIT_PER_IP.max, SEND_LIMIT_PER_IP.window)) {
    logger.warn('MARKET:AUTH', 'OTP send rate limited (IP)', { ip })
    return { success: false, error: 'rate_limited' }
  }

  try {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: true,
      },
    })

    if (error) {
      logger.warn('MARKET:AUTH', 'OTP send failed', { email: trimmed, error: error.message })

      // Supabase 内建 60s 冷却期（错误信息格式不固定）
      if (error.message.includes('rate') || error.message.includes('security purposes') || error.message.includes('seconds')) {
        return { success: false, error: 'rate_limited' }
      }
      return { success: false, error: 'send_failed' }
    }

    logger.info('MARKET:AUTH', 'OTP sent', { email: trimmed })
    return { success: true }
  } catch (err) {
    logger.error('MARKET:AUTH', 'OTP send error', { error: err instanceof Error ? err.message : String(err) })
    return { success: false, error: 'send_failed' }
  }
}

export async function verifyOTP(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedEmail = email.trim().toLowerCase()
  const trimmedToken = token.trim()

  if (!trimmedToken || trimmedToken.length !== 6) {
    return { success: false, error: 'invalid_code' }
  }

  // 暴力破解保护：每 (email+IP) 15 分钟内最多 5 次验证尝试
  const ip = await getClientIP()
  if (!checkRateLimit(`otp-verify:${trimmedEmail}:${ip}`, VERIFY_LIMIT.max, VERIFY_LIMIT.window)) {
    logger.warn('MARKET:AUTH', 'OTP verify rate limited', { email: trimmedEmail, ip })
    return { success: false, error: 'rate_limited' }
  }

  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'email',
    })

    if (error) {
      logger.warn('MARKET:AUTH', 'OTP verify failed', { email: trimmedEmail, error: error.message })

      if (error.message.includes('expired')) {
        return { success: false, error: 'code_expired' }
      }
      if (error.message.includes('invalid') || error.message.includes('Token')) {
        return { success: false, error: 'invalid_code' }
      }
      return { success: false, error: 'verify_failed' }
    }

    if (!data.session) {
      return { success: false, error: 'verify_failed' }
    }

    logger.info('MARKET:AUTH', 'OTP verified', {
      email: trimmedEmail,
      userId: data.session.user.id,
    })

    return { success: true }
  } catch (err) {
    logger.error('MARKET:AUTH', 'OTP verify error', { error: err instanceof Error ? err.message : String(err) })
    return { success: false, error: 'verify_failed' }
  }
}

export async function getMarketSession(): Promise<{
  authenticated: boolean
  userId?: string
  email?: string
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { authenticated: false }
    }

    return {
      authenticated: true,
      userId: user.id,
      email: user.email,
    }
  } catch {
    return { authenticated: false }
  }
}

export async function signOutMarket(): Promise<{ success: boolean }> {
  try {
    const supabase = await createServerClient()
    await supabase.auth.signOut()
    return { success: true }
  } catch {
    return { success: false }
  }
}
