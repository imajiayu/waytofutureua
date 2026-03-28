'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface MarketAuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  /** 触发 OTP 认证流程（通过设置 showAuthModal = true） */
  requireAuth: () => void
  /** 是否应显示 OTP Modal */
  showAuthModal: boolean
  /** 关闭 OTP Modal */
  closeAuthModal: () => void
  /** 认证成功后的回调（用于恢复中断的操作） */
  onAuthSuccess: () => void
  /** 设置认证成功后的回调 */
  setAuthCallback: (callback: () => void) => void
}

export function useMarketAuth(): MarketAuthState {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authCallback, setAuthCallbackState] = useState<(() => void) | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // 获取经服务端验证的用户信息（getUser 比 getSession 更安全）
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null)
      setIsLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const requireAuth = useCallback(() => {
    if (user) return // 已认证，无需弹窗
    setShowAuthModal(true)
  }, [user])

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false)
  }, [])

  const onAuthSuccess = useCallback(() => {
    setShowAuthModal(false)
    authCallback?.()
    setAuthCallbackState(null)
  }, [authCallback])

  const setAuthCallback = useCallback((callback: () => void) => {
    setAuthCallbackState(() => callback)
  }, [])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    requireAuth,
    showAuthModal,
    closeAuthModal,
    onAuthSuccess,
    setAuthCallback,
  }
}
