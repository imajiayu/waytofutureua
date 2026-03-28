'use server'

import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ============================================
// Market 模块 — 邮箱 OTP 认证
// 使用 Supabase Auth 内建的 Email OTP
// ============================================

export async function sendOTP(email: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { success: false, error: 'invalid_email' }
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

      // Supabase 内建 60s 冷却期
      if (error.message.includes('rate') || error.message.includes('60')) {
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
