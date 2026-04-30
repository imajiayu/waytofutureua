import { getLocale } from 'next-intl/server'

import { getPublicMarketItems } from '@/app/actions/market-items'
import { logger } from '@/lib/logger'
import { loadMarketItemContents } from '@/lib/market/market-content'

import HomeMarketCards from './HomeMarketCards'

export default async function HomeMarketGrid() {
  const locale = await getLocale()

  let items: Awaited<ReturnType<typeof getPublicMarketItems>>['items'] = []
  try {
    const result = await getPublicMarketItems({ status: 'on_sale' })
    items = result.items
  } catch (error) {
    logger.errorWithStack('MARKET:ITEMS', 'Failed to fetch market items for home', error)
  }

  if (items.length === 0) return null

  const contentMap = await loadMarketItemContents(
    items.map((i) => i.id),
    locale
  )

  return (
    <div className="mt-1 w-full md:mt-2">
      {/* Horizontal Scrolling Container */}
      <div className="scrollbar-hide overflow-x-auto pb-4 pt-2">
        <HomeMarketCards items={items} contentMap={contentMap} />
      </div>
    </div>
  )
}
