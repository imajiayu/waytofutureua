'use client'

import { useTranslations } from 'next-intl'
import MarketItemCard from './MarketItemCard'
import type { PublicMarketItem, MarketItemContent } from '@/types/market'

interface MarketItemGridProps {
  items: PublicMarketItem[]
  contentMap: Record<number, MarketItemContent>
}

export default function MarketItemGrid({ items, contentMap }: MarketItemGridProps) {
  const t = useTranslations('market')

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 text-lg">{t('emptyState')}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map(item => (
        <MarketItemCard key={item.id} item={item} content={contentMap[item.id] ?? null} />
      ))}
    </div>
  )
}
