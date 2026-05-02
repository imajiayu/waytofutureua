import type { ProjectFilters, ProjectStats } from '@/types'

import { createServerClient } from './server'

export async function getProjectStats(projectId?: number) {
  const supabase = await createServerClient()
  let query = supabase.from('project_stats').select('*')

  if (projectId !== undefined && projectId !== null) {
    query = query.eq('id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return projectId !== undefined && projectId !== null
    ? (data[0] as ProjectStats)
    : (data as ProjectStats[])
}

export async function getAllProjectsWithStats(filters?: ProjectFilters) {
  const supabase = await createServerClient()
  let query = supabase.from('project_stats').select('*')

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.location) {
    query = query.eq('location', filters.location)
  }

  if (filters?.is_long_term !== undefined) {
    query = query.eq('is_long_term', filters.is_long_term)
  }

  const { data, error } = await query

  if (error) throw error

  // Sort by status: active > paused > planned > completed, then by ID descending
  const sortedData = (data as ProjectStats[]).sort((a, b) => {
    const statusOrder: Record<string, number> = {
      active: 0,
      paused: 1,
      planned: 2,
      completed: 3,
    }

    const aOrder = statusOrder[a.status ?? 'paused'] ?? 999
    const bOrder = statusOrder[b.status ?? 'paused'] ?? 999
    const statusDiff = aOrder - bOrder

    if (statusDiff === 0) {
      return (b.id ?? 0) - (a.id ?? 0)
    }

    return statusDiff
  })

  return sortedData
}
