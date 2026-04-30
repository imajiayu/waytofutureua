import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/database'

/**
 * 创建服务端 Supabase 客户端（支持认证）
 */
export async function createAuthClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // 在某些 Next.js 上下文中可能无法设置 cookie
          }
        },
      },
    }
  )
}

/**
 * 获取当前管理员用户（通过服务器端验证）
 */
export async function getAdminUser() {
  const supabase = await createAuthClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * 检查是否为管理员
 */
export async function isAdmin() {
  const supabase = await createAuthClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return false
  const { data: adminCheck, error: rpcError } = await supabase.rpc('is_admin')
  if (rpcError) {
    console.error('[AUTH] is_admin RPC failed:', rpcError.message)
    return false
  }
  return !!adminCheck
}

/**
 * 要求管理员权限（用于 Server Actions）
 */
export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('Unauthorized: Admin access required')
  }
}
