import type { ProjectStats } from '@/types'

export interface ProjectProgress {
  currentUnits: number
  targetUnits: number
  totalRaised: number
  hasValidTarget: boolean
  progressCurrent: number
}

export function getProjectProgress(project: ProjectStats): ProjectProgress {
  const currentUnits = project.current_units ?? 0
  const targetUnits = project.target_units ?? 0
  const totalRaised = project.total_raised ?? 0
  const hasValidTarget = targetUnits > 0

  // For progress bar: aggregated projects use total_raised (amount), non-aggregated use current_units
  const progressCurrent = project.aggregate_donations ? totalRaised : currentUnits

  return { currentUnits, targetUnits, totalRaised, hasValidTarget, progressCurrent }
}
