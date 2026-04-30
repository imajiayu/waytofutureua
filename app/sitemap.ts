import type { MetadataRoute } from 'next'

import { locales } from '@/i18n/config'
import { BASE_URL } from '@/lib/constants'

// 使用固定日期，避免每次请求都生成新的 lastModified 导致搜索引擎忽略该信号
const LAST_UPDATED = new Date('2026-03-06')

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    '',
    '/donate',
    '/track-donation',
    '/market',
    '/privacy-policy',
    '/public-agreement',
  ]

  const entries: MetadataRoute.Sitemap = []

  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: LAST_UPDATED,
        changeFrequency: page === '' ? 'weekly' : 'monthly',
        priority: page === '' ? 1.0 : 0.7,
      })
    }
  }

  return entries
}
