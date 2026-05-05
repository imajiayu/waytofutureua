'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getAdminClient } from '@/lib/supabase/action-clients'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations'
import type { Database } from '@/types/database'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']

/**
 * 获取所有项目（管理员视图）
 */
export async function getAdminProjects() {
  const supabase = await getAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

/**
 * 创建项目
 */
export async function createProject(project: ProjectInsert) {
  const supabase = await getAdminClient()

  // 运行时验证已知字段，passthrough 放行额外字段
  let validated: ProjectInsert
  try {
    validated = createProjectSchema.parse(project) as ProjectInsert
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Validation failed: ${err.errors.map((e) => e.message).join(', ')}`)
    }
    throw err
  }

  const { data, error } = await supabase.from('projects').insert(validated).select().single()

  if (error) throw error

  revalidatePath('/admin/projects')
  revalidatePath('/[locale]', 'page')
  return data as Project
}

/**
 * 更新项目
 */
export async function updateProject(id: number, updates: ProjectUpdate) {
  const supabase = await getAdminClient()

  // 确保不修改这些字段
  const { id: _, created_at, updated_at, ...safeUpdates } = updates as Record<string, unknown>

  // 运行时验证已知字段，passthrough 放行额外字段
  let validated: ProjectUpdate
  try {
    validated = updateProjectSchema.parse(safeUpdates) as ProjectUpdate
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Validation failed: ${err.errors.map((e) => e.message).join(', ')}`)
    }
    throw err
  }

  const { data, error } = await supabase
    .from('projects')
    .update(validated)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/admin/projects')
  revalidatePath('/[locale]', 'page')
  return data as Project
}
