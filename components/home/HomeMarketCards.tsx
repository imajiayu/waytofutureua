'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from '@/i18n/navigation'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import MarketItemCard from '@/components/market/MarketItemCard'
import type { PublicMarketItem, MarketItemContent } from '@/types/market'

interface HomeMarketCardsProps {
  items: PublicMarketItem[]
  contentMap: Record<number, MarketItemContent>
}

export default function HomeMarketCards({ items, contentMap }: HomeMarketCardsProps) {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => { setIsNavigating(false) }, [pathname])
  const handleNavigate = useCallback(() => setIsNavigating(true), [])

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />
      <div className="flex gap-5 min-w-min px-6">
        {items.map((item) => (
          <div key={item.id} className="w-[260px] sm:w-[280px] flex-shrink-0">
            <MarketItemCard item={item} content={contentMap[item.id] ?? null} onNavigate={handleNavigate} />
          </div>
        ))}
      </div>
    </>
  )
}
