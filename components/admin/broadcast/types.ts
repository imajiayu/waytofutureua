import type { AppLocale } from '@/types'

export interface Subscriber {
  email: string
  locale: AppLocale
  is_subscribed: boolean
}
