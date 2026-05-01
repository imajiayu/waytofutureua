'use client'

import { useState } from 'react'

import { getAdminMarketOrders } from '@/app/actions/market-admin'
import EmptyState from '@/components/ui/EmptyState'
import { useTableFilters } from '@/lib/hooks/useTableFilters'
import { getTranslatedText } from '@/lib/i18n-utils'
import {
  canManageOrderFiles,
  getNextOrderStatuses,
  ORDER_STATUS_COLORS,
} from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import type { AdminMarketOrder, MarketOrderStatus } from '@/types/market'
import { MARKET_ORDER_STATUSES } from '@/types/market'

import MarketOrderEditModal from './MarketOrderEditModal'

interface MarketOrdersTableProps {
  initialOrders: AdminMarketOrder[]
}

interface MarketOrderTableFilters {
  status: MarketOrderStatus | ''
}

export default function MarketOrdersTable({ initialOrders }: MarketOrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [editingOrder, setEditingOrder] = useState<AdminMarketOrder | null>(null)

  const {
    filters,
    setFilters,
    filtered: filteredOrders,
  } = useTableFilters<AdminMarketOrder, MarketOrderTableFilters>(
    orders,
    { status: '' },
    (order, f) => !f.status || order.status === f.status
  )

  const refresh = async () => {
    const { orders: fresh } = await getAdminMarketOrders()
    setOrders(fresh)
  }

  const handleSaved = async () => {
    setEditingOrder(null)
    await refresh()
  }

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((p) => ({ ...p, status: e.target.value as MarketOrderStatus | '' }))
            }
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm sm:flex-none"
          >
            <option value="">All</option>
            {MARKET_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-400">
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {filteredOrders.map((order) => {
          const colors = ORDER_STATUS_COLORS[order.status]
          const nextStatuses = getNextOrderStatuses(order.status)
          const hasFiles = canManageOrderFiles(order.status)
          const itemTitle = order.market_items
            ? getTranslatedText(order.market_items.title_i18n, null, 'en')
            : null
          return (
            <div
              key={order.id}
              className="rounded-lg border border-gray-200 bg-white p-3"
              onClick={() => setEditingOrder(order)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900">
                    {itemTitle || <span className="font-mono text-gray-400">#{order.item_id}</span>}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-gray-500">{order.buyer_email}</div>
                </div>
                <span
                  className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {order.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-data text-sm font-medium text-gray-900">
                  {formatMarketPrice(order.total_amount, order.currency)}
                  {order.quantity > 1 && (
                    <span className="ml-1 text-gray-400">&times;{order.quantity}</span>
                  )}
                </span>
                <span className="font-mono text-gray-400">{order.order_reference}</span>
              </div>
              {order.tracking_number && (
                <div className="mt-1 truncate font-mono text-xs text-gray-400">
                  Tracking: {order.tracking_number}
                </div>
              )}
              {(nextStatuses.length > 0 || hasFiles) && (
                <div className="mt-2 flex gap-3 border-t border-gray-100 pt-2 text-sm">
                  {nextStatuses.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingOrder(order)
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      → {nextStatuses[0]}
                    </button>
                  )}
                  {hasFiles && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingOrder(order)
                      }}
                      className="text-gray-500 hover:text-gray-700"
                      title="Manage proof files"
                    >
                      📁 Files
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {filteredOrders.length === 0 && <EmptyState message="No orders found" />}
      </div>

      {/* Desktop table view */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Buyer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Payment
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
            {filteredOrders.map((order) => {
              const colors = ORDER_STATUS_COLORS[order.status]
              const nextStatuses = getNextOrderStatuses(order.status)
              const hasFiles = canManageOrderFiles(order.status)
              const itemTitle = order.market_items
                ? getTranslatedText(order.market_items.title_i18n, null, 'en')
                : null
              return (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-mono text-sm text-gray-500">
                    {order.order_reference}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.buyer_email}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-sm text-gray-900">
                    {itemTitle || <span className="font-mono text-gray-400">#{order.item_id}</span>}
                  </td>
                  <td className="px-4 py-3 font-data text-sm">
                    {formatMarketPrice(order.total_amount, order.currency)}
                    {order.quantity > 1 && (
                      <span className="ml-1 text-gray-400">&times;{order.quantity}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {order.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {order.status}
                    </span>
                    {order.tracking_number && (
                      <div className="mt-1 font-mono text-xs text-gray-400">
                        {order.tracking_number}
                      </div>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-3 text-sm">
                    {nextStatuses.length > 0 && (
                      <button
                        onClick={() => setEditingOrder(order)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        → {nextStatuses[0]}
                      </button>
                    )}
                    {hasFiles && (
                      <button
                        onClick={() => setEditingOrder(order)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Manage proof files"
                      >
                        📁
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <EmptyState message="No orders found" className="hidden sm:block" />
      )}

      {/* Edit Modal */}
      {editingOrder && (
        <MarketOrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
