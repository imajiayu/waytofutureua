'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import { usePathname } from '@/i18n/navigation'
import type { MarketItemContent, PublicMarketItem } from '@/types/market'

import MarketItemCard from './MarketItemCard'

interface MarketItemGridProps {
  items: PublicMarketItem[]
  contentMap: Record<number, MarketItemContent>
}

export default function MarketItemGrid({ items, contentMap }: MarketItemGridProps) {
  const t = useTranslations('market')
  const pathname = usePathname()

  // P3-3: 单个 GlobalLoadingSpinner 管理所有卡片的导航态
  const [isNavigating, setIsNavigating] = useState(false)
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])
  const handleNavigate = useCallback(() => setIsNavigating(true), [])

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-gray-500">{t('emptyState')}</p>
      </div>
    )
  }

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <MarketItemCard
            key={item.id}
            item={item}
            content={contentMap[item.id] ?? null}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    </>
  )
}
