'use client'

import { useState, useEffect } from 'react'
import { clientLogger } from '@/lib/logger-client'
import type { MarketItemContent } from '@/types/market'

export function useMarketItemContent(
  itemId: number,
  locale: string
): { data: MarketItemContent | null; loading: boolean } {
  const [data, setData] = useState<MarketItemContent | null>(null)
  const [loading, setLoading] = useState(true)

  const url = `/content/market/item-${itemId}-${locale}.json`

  useEffect(() => {
    setLoading(true)
    setData(null)
    const load = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) {
          setData(await response.json())
        } else {
          clientLogger.warn('UI', `No content found for market item ${itemId}`, { url })
        }
      } catch (error) {
        clientLogger.error('UI', 'Error loading market item content', {
          itemId,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [url, itemId])

  return { data, loading }
}
