'use client'

import { useState } from 'react'
import { getTranslatedText } from '@/lib/i18n-utils'
import { ITEM_STATUS_COLORS } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { getAdminMarketItems, publishMarketItem, cancelMarketItem } from '@/app/actions/market-admin'
import type { MarketItem } from '@/types/market'

interface MarketItemsTableProps {
  initialItems: MarketItem[]
}

export default function MarketItemsTable({ initialItems }: MarketItemsTableProps) {
  const [items, setItems] = useState(initialItems)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const refresh = async () => {
    const { items: fresh } = await getAdminMarketItems()
    setItems(fresh)
  }

  const handlePublish = async (id: number) => {
    setActionLoading(id)
    await publishMarketItem(id)
    await refresh()
    setActionLoading(null)
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this item?')) return
    setActionLoading(id)
    await cancelMarketItem(id)
    await refresh()
    setActionLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map(item => {
              const colors = ITEM_STATUS_COLORS[item.status]
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium max-w-[200px] truncate">
                    {getTranslatedText(item.title_i18n, 'en') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      Sale
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-data">
                    {formatMarketPrice(item.fixed_price || 0, item.currency)}
                    {item.stock_quantity !== null && (
                      <span className="text-gray-400 ml-2">
                        ({item.stock_quantity} in stock)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {colors && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                        {item.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
                    {item.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(item.id)}
                        disabled={actionLoading === item.id}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        Publish
                      </button>
                    )}
                    {item.status === 'on_sale' && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        disabled={actionLoading === item.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-gray-400">No items found</div>
      )}
    </div>
  )
}
