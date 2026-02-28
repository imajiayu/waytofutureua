import { createServerClient } from './server'
import type {
  Project,
  Donation,
  ProjectStats,
  ProjectFilters,
  DonationFilters,
  DonationStatus,
} from '@/types'

// ============= PROJECT QUERIES =============

export async function getProjects(filters?: ProjectFilters) {
  const supabase = await createServerClient()
  let query = supabase.from('projects').select('*')

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.location) {
    query = query.eq('location', filters.location)
  }

  if (filters?.is_long_term !== undefined) {
    query = query.eq('is_long_term', filters.is_long_term)
  }

  if (filters?.search) {
    query = query.or(`project_name.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

export async function getProjectById(id: number) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Project
}

export async function getActiveProjects() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

export async function getProjectStats(projectId?: number) {
  const supabase = await createServerClient()
  let query = supabase.from('project_stats').select('*')

  if (projectId !== undefined && projectId !== null) {
    query = query.eq('id', projectId)
  }

  const { data, error } = await query

  if (error) throw error
  return (projectId !== undefined && projectId !== null) ? (data[0] as ProjectStats) : (data as ProjectStats[])
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
      completed: 3
    }

    const aOrder = statusOrder[a.status ?? 'paused'] ?? 999
    const bOrder = statusOrder[b.status ?? 'paused'] ?? 999
    const statusDiff = aOrder - bOrder

    // If same status, sort by ID (descending — newer projects first)
    if (statusDiff === 0) {
      return (b.id ?? 0) - (a.id ?? 0)
    }

    return statusDiff
  })

  return sortedData
}

// ============= DONATION QUERIES =============

export async function getDonations(filters?: DonationFilters) {
  const supabase = await createServerClient()
  let query = supabase.from('donations').select('*, projects(id, project_name, project_name_i18n, location, location_i18n, unit_name, unit_name_i18n)')

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters?.status) {
    query = query.eq('donation_status', filters.status)
  }

  if (filters?.donor_email) {
    query = query.eq('donor_email', filters.donor_email)
  }

  if (filters?.date_from) {
    query = query.gte('donated_at', filters.date_from)
  }

  if (filters?.date_to) {
    query = query.lte('donated_at', filters.date_to)
  }

  const { data, error } = await query.order('donated_at', { ascending: false })

  if (error) throw error
  return data
}

// ============= CREATE OPERATIONS =============

export async function createProject(projectData: {
  project_name: string
  location: string
  start_date: string
  end_date?: string | null
  is_long_term?: boolean
  target_units: number
  unit_name?: string
  status?: 'planned' | 'active'
}) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    // @ts-expect-error - Supabase generated types are overly restrictive
    .insert(projectData)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function createDonation(donationData: {
  donation_public_id: string
  project_id: number
  donor_name: string
  donor_email: string
  donor_phone?: string | null
  amount: number
  currency?: string
  payment_method?: string
  donation_status?: DonationStatus
  locale?: 'en' | 'zh' | 'ua'
}) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('donations')
    .insert(donationData)
    .select()
    .single()

  if (error) throw error
  return data as Donation
}

// ============= UPDATE OPERATIONS =============

export async function updateProject(
  projectId: number,
  updates: Partial<Project>
) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function updateDonationStatus(
  donationId: number,
  status: DonationStatus
) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('donations')
    .update({ donation_status: status })
    .eq('id', donationId)
    .select()
    .single()

  if (error) throw error
  return data as Donation
}

