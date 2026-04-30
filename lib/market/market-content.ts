import { readFile } from 'fs/promises'
import { join } from 'path'

import type { MarketItemContent } from '@/types/market'

/**
 * 服务端加载义卖商品内容 JSON（从 public/ 目录读取）
 * 用于 Server Component 预加载，避免客户端 fetch 闪烁
 */
export async function loadMarketItemContent(
  itemId: number,
  locale: string
): Promise<MarketItemContent | null> {
  try {
    const filePath = join(
      process.cwd(),
      'public',
      'content',
      'market',
      `item-${itemId}-${locale}.json`
    )
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as MarketItemContent
  } catch {
    return null
  }
}

/**
 * 批量加载多个商品的内容 JSON，返回 itemId → content 的映射
 */
export async function loadMarketItemContents(
  itemIds: number[],
  locale: string
): Promise<Record<number, MarketItemContent>> {
  const entries = await Promise.all(
    itemIds.map(async (id) => {
      const content = await loadMarketItemContent(id, locale)
      return [id, content] as const
    })
  )
  const result: Record<number, MarketItemContent> = {}
  for (const [id, content] of entries) {
    if (content) result[id] = content
  }
  return result
}
