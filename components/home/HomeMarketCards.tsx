'use client'

import { useCallback, useEffect, useState } from 'react'

import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import MarketItemCard from '@/components/market/MarketItemCard'
import { usePathname } from '@/i18n/navigation'
import type { MarketItemContent, PublicMarketItem } from '@/types/market'

interface HomeMarketCardsProps {
  items: PublicMarketItem[]
  contentMap: Record<number, MarketItemContent>
}

export default function HomeMarketCards({ items, contentMap }: HomeMarketCardsProps) {
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])
  const handleNavigate = useCallback(() => setIsNavigating(true), [])

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />
      <div className="flex min-w-min gap-5 px-6">
        {items.map((item) => (
          <div key={item.id} className="w-[260px] flex-shrink-0 sm:w-[280px]">
            <MarketItemCard
              item={item}
              content={contentMap[item.id] ?? null}
              onNavigate={handleNavigate}
            />
          </div>
        ))}
      </div>
    </>
  )
}
