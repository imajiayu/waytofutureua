import type { ProjectResult, ProjectStats } from '@/types'

export interface Shelter {
  name: string
  nameOriginal: string
  address: string
  childrenCount: number
}

export interface Child {
  name: string
  gift: string
}

export interface GiftList {
  shelter: string
  children: Child[]
}

export interface Project3Content {
  title: string
  subtitle: string
  images: string[]
  introduction: string[]
  shelters: Shelter[]
  statistics: {
    totalChildren: number
    totalCost: { uah: number; usd: number }
    averagePerChild: number
    currency: string
  }
  giftsList: GiftList[]
  results: ProjectResult[]
}

export interface SupplyItem {
  item: string
  quantity: number
  unitPrice: { uah: number; usd: number }
}

export interface SuppliesData {
  supplies: SupplyItem[]
  total: { items: number; totalCost: { uah: number; usd: number } }
  exchangeRateNote: string
  receipts: { description: string; images: string[] }
}

export interface Project3DetailContentProps {
  project: ProjectStats
  locale: string
}

export interface SectionProps {
  content: Project3Content
  locale: string
}

export interface SuppliesSectionProps {
  suppliesData: SuppliesData
  locale: string
  onReceiptClick: (index: number) => void
}
