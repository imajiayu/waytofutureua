'use client'

import { useState } from 'react'

import { deleteMarketItem, getAdminMarketItems, updateMarketItem } from '@/app/actions/market-admin'
import { getTranslatedText } from '@/lib/i18n-utils'
import { getNextItemStatuses, ITEM_STATUS_COLORS } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { MarketItem } from '@/types/market'

import MarketItemCreateModal from './MarketItemCreateModal'
import MarketItemEditModal from './MarketItemEditModal'

interface MarketItemsTableProps {
  initialItems: MarketItem[]
}

export default function MarketItemsTable({ initialItems }: MarketItemsTableProps) {
  const [items, setItems] = useState(initialItems)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null)

  const refresh = async () => {
    const { items: fresh } = await getAdminMarketItems()
    setItems(fresh)
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    setActionLoading(id)
    await updateMarketItem(id, { status: newStatus } as Partial<MarketItem>)
    await refresh()
    setActionLoading(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this draft item? This cannot be undone.')) return
    setActionLoading(id)
    const { error } = await deleteMarketItem(id)
    if (error) {
      alert(error)
    } else {
      setItems(items.filter((i) => i.id !== id))
    }
    setActionLoading(null)
  }

  const handleCreated = (item: MarketItem) => {
    setItems([item, ...items])
    setIsCreating(false)
  }

  const handleSaved = (updated: MarketItem) => {
    setItems(items.map((i) => (i.id === updated.id ? updated : i)))
    setEditingItem(null)
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <button
          onClick={() => setIsCreating(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create New Item
        </button>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {items.map((item) => {
          const colors = ITEM_STATUS_COLORS[item.status]
          const nextStatuses = getNextItemStatuses(item.status)
          return (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {getTranslatedText(item.title_i18n, null, 'en') || '—'}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-gray-500">#{item.id}</div>
                </div>
                {colors && (
                  <span
                    className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                  >
                    {item.status}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="font-data text-sm font-medium">
                  {formatMarketPrice(item.fixed_price || 0, item.currency)}
                </span>
                {item.stock_quantity !== null && (
                  <span className="text-xs text-gray-400">{item.stock_quantity} in stock</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 border-t border-gray-100 pt-2 text-sm">
                <button
                  onClick={() => setEditingItem(item)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Edit
                </button>
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(item.id, status)}
                    disabled={actionLoading === item.id}
                    className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    &rarr; {status}
                  </button>
                ))}
                {item.status === 'draft' && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={actionLoading === item.id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {items.length === 0 && <div className="py-8 text-center text-gray-400">No items found</div>}
      </div>

      {/* Desktop table view */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {items.map((item) => {
              const colors = ITEM_STATUS_COLORS[item.status]
              const nextStatuses = getNextItemStatuses(item.status)
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-mono text-sm text-gray-500">{item.id}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm font-medium text-gray-900">
                    {getTranslatedText(item.title_i18n, null, 'en') || '—'}
                  </td>
                  <td className="px-4 py-3 font-data text-sm">
                    {formatMarketPrice(item.fixed_price || 0, item.currency)}
                    {item.stock_quantity !== null && (
                      <span className="ml-2 text-gray-400">({item.stock_quantity} in stock)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {colors && (
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {item.status}
                      </span>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-3 text-sm">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Edit
                    </button>
                    {nextStatuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(item.id, status)}
                        disabled={actionLoading === item.id}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        &rarr; {status}
                      </button>
                    ))}
                    {item.status === 'draft' && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={actionLoading === item.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Delete
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
        <div className="hidden py-8 text-center text-gray-400 sm:block">No items found</div>
      )}

      {isCreating && (
        <MarketItemCreateModal onClose={() => setIsCreating(false)} onCreated={handleCreated} />
      )}

      {editingItem && (
        <MarketItemEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
