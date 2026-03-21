import type { ProjectStats } from '@/types'

export interface BackgroundContent {
  title: string
  paragraphs: string[]
}

export interface ExpenseItem {
  name: string
  amount: number
  currency: string
}

export interface EventItem {
  date: string
  location: string
  images: string[]
  expenses?: ExpenseItem[]
}

export interface EventsContent {
  title: string
  list: EventItem[]
}

export interface Project5Content {
  title: string
  subtitle: string
  location: string
  background: BackgroundContent
  events: EventsContent
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
