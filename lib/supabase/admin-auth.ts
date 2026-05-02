import { logger } from '@/lib/logger'

import { createServerClient } from './server'

/**
 * 创建服务端 Supabase 客户端（支持认证）。
 *
 * 与 `createServerClient` 完全等价（同 cookies 适配器、同 SUPABASE_URL/ANON_KEY），
 * 保留 `createAuthClient` 命名只是为了语义入口区分（admin auth vs SSR 页面）。
 */
export const createAuthClient = createServerClient

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
    logger.error('AUTH', 'is_admin RPC failed', { error: rpcError.message })
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
