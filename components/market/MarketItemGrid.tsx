'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname } from '@/i18n/navigation'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import MarketItemCard from './MarketItemCard'
import type { PublicMarketItem, MarketItemContent } from '@/types/market'

interface MarketItemGridProps {
  items: PublicMarketItem[]
  contentMap: Record<number, MarketItemContent>
}

export default function MarketItemGrid({ items, contentMap }: MarketItemGridProps) {
  const t = useTranslations('market')
  const pathname = usePathname()

  // P3-3: 单个 GlobalLoadingSpinner 管理所有卡片的导航态
  const [isNavigating, setIsNavigating] = useState(false)
  useEffect(() => { setIsNavigating(false) }, [pathname])
  const handleNavigate = useCallback(() => setIsNavigating(true), [])

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 text-lg">{t('emptyState')}</p>
      </div>
    )
  }

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(item => (
          <MarketItemCard key={item.id} item={item} content={contentMap[item.id] ?? null} onNavigate={handleNavigate} />
        ))}
      </div>
    </>
  )
}
