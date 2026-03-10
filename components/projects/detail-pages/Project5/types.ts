import type { ProjectStats } from '@/types'

export interface Project5Content {
  title: string
  subtitle: string
  location: string
}

export interface Project5DetailContentProps {
  project: ProjectStats
  locale: string
}

export interface SectionProps {
  content: Project5Content
  project: ProjectStats
  locale: string
}
