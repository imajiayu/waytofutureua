'use client'

import type { ProjectStats } from '@/types'

import ProjectCardCompact from './cards/ProjectCardCompact'
import ProjectCardFull from './cards/ProjectCardFull'

interface ProjectCardProps {
  project: ProjectStats
  locale: string

  // Display mode
  mode?: 'full' | 'compact' // Default: 'full'

  // Configuration
  showProgress?: boolean

  // Selection state (only for compact mode)
  isSelected?: boolean
  onSelect?: (id: number) => void

  // Force collapse details (used for scroll-based collapse on mobile)
  forceCollapse?: boolean
}

export default function ProjectCard({
  project,
  locale,
  mode = 'full',
  showProgress = true,
  isSelected = false,
  onSelect,
  forceCollapse = false,
}: ProjectCardProps) {
  if (mode === 'compact') {
    return (
      <ProjectCardCompact
        project={project}
        locale={locale}
        isSelected={isSelected}
        onSelect={onSelect}
        forceCollapse={forceCollapse}
      />
    )
  }

  return <ProjectCardFull project={project} locale={locale} showProgress={showProgress} />
}
