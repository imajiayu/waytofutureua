import type { ProjectStats, ProjectResult } from '@/types'

export interface Statistic {
  value: number
  label: string
  description: string
  isAmount?: boolean
}

export interface Value {
  name: string
  description: string
}

export interface Mission {
  title: string
  content: string
  values: Value[]
}

export interface TreatmentProgram {
  name: string
  description: string
}

export interface SuccessStory {
  title: string
  description: string
  image: string
}

export interface Challenges {
  title: string
  content: string[]
}

export interface YearlyFinancialData {
  year: string
  period: string
  staffCount: number
  expenses: number
  donations: number
  governmentCompensation: number
  deficit: number
  reportImage?: string
}

export interface ExpenseCategory {
  name: string
  percentage: number
  description: string
}

export interface FinancialStatus {
  title: string
  description: string
  yearlyData: YearlyFinancialData[]
  breakdown: {
    title: string
    categories: ExpenseCategory[]
  }
}

export interface ProgressImage {
  url: string
  caption: string
  priority: number
}

export interface ProgressGallery {
  title: string
  description: string
  images: ProgressImage[]
}

export interface CallToActionPurpose {
  title: string
  description: string
}

export interface CallToAction {
  title: string
  content: string
  purposes: CallToActionPurpose[]
  closing: string
}

export interface DonationResultItem {
  image: string
  orientation?: 'landscape' | 'portrait'
  aspectRatio?: number
}

export interface DonationResultsData {
  title: string
  items: DonationResultItem[]
}

export interface Project0Content {
  title: string
  subtitle: string
  location: string
  locationDetail: string
  foundationDate: string
  images: string[]
  introduction: string[]
  statistics: Record<string, Statistic>
  mission: Mission
  team: {
    title: string
    description: string
    members: string[]
  }
  treatmentPrograms: {
    title: string
    description: string
    programs: TreatmentProgram[]
  }
  successStories: SuccessStory[]
  challenges: Challenges
  financialStatus: FinancialStatus
  callToAction?: CallToAction
  progressGallery: ProgressGallery
  results: ProjectResult[]
  donationResults?: DonationResultsData
}

export interface Project0DetailContentProps {
  project: ProjectStats
  locale: string
}

export interface SectionProps {
  content: Project0Content
  locale: string
}
