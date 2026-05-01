'use server'

import { getUserClient } from '@/lib/supabase/action-clients'

/**
 * 管理员登录
 */
export async function adminLogin(email: string, password: string) {
  const supabase = await getUserClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user }
}

/**
 * 管理员登出
 */
export async function adminLogout() {
  const supabase = await getUserClient()
  await supabase.auth.signOut()
  return { success: true }
}
