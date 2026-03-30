'use client'

import { useState, useMemo } from 'react'
import { getTranslatedText } from '@/lib/i18n-utils'
import { ORDER_STATUS_COLORS, getNextOrderStatuses, canManageOrderFiles } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { getAdminMarketOrders } from '@/app/actions/market-admin'
import { MARKET_ORDER_STATUSES } from '@/types/market'
import type { AdminMarketOrder, MarketOrderStatus } from '@/types/market'
import MarketOrderEditModal from './MarketOrderEditModal'

interface MarketOrdersTableProps {
  initialOrders: AdminMarketOrder[]
}

export default function MarketOrdersTable({ initialOrders }: MarketOrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [statusFilter, setStatusFilter] = useState<MarketOrderStatus | ''>('')
  const [editingOrder, setEditingOrder] = useState<AdminMarketOrder | null>(null)

  const filteredOrders = useMemo(
    () => statusFilter ? orders.filter(o => o.status === statusFilter) : orders,
    [orders, statusFilter]
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as MarketOrderStatus | '')}
            className="flex-1 sm:flex-none px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All</option>
            {MARKET_ORDER_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <span className="text-sm text-gray-400">
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {filteredOrders.map(order => {
          const colors = ORDER_STATUS_COLORS[order.status]
          const nextStatuses = getNextOrderStatuses(order.status)
          const hasFiles = canManageOrderFiles(order.status)
          const itemTitle = order.market_items
            ? getTranslatedText(order.market_items.title_i18n, null, 'en')
            : null
          return (
            <div
              key={order.id}
              className="bg-white border border-gray-200 rounded-lg p-3"
              onClick={() => setEditingOrder(order)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {itemTitle || <span className="text-gray-400 font-mono">#{order.item_id}</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-0.5">{order.buyer_email}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${colors.bg} ${colors.text}`}>
                  {order.status}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-sm font-data font-medium text-gray-900">
                  {formatMarketPrice(order.total_amount, order.currency)}
                  {order.quantity > 1 && <span className="text-gray-400 ml-1">&times;{order.quantity}</span>}
                </span>
                <span className="font-mono text-gray-400">{order.order_reference}</span>
              </div>
              {order.tracking_number && (
                <div className="mt-1 text-xs text-gray-400 font-mono truncate">
                  Tracking: {order.tracking_number}
                </div>
              )}
              {(nextStatuses.length > 0 || hasFiles) && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex gap-3 text-sm">
                  {nextStatuses.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingOrder(order) }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      → {nextStatuses[0]}
                    </button>
                  )}
                  {hasFiles && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingOrder(order) }}
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
        {filteredOrders.length === 0 && (
          <div className="text-center py-8 text-gray-400">No orders found</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map(order => {
              const colors = ORDER_STATUS_COLORS[order.status]
              const nextStatuses = getNextOrderStatuses(order.status)
              const hasFiles = canManageOrderFiles(order.status)
              const itemTitle = order.market_items
                ? getTranslatedText(order.market_items.title_i18n, null, 'en')
                : null
              return (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{order.order_reference}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.buyer_email}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[180px] truncate">
                    {itemTitle || <span className="text-gray-400 font-mono">#{order.item_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm font-data">
                    {formatMarketPrice(order.total_amount, order.currency)}
                    {order.quantity > 1 && <span className="text-gray-400 ml-1">&times;{order.quantity}</span>}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {order.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {order.status}
                    </span>
                    {order.tracking_number && (
                      <div className="text-xs text-gray-400 mt-1 font-mono">{order.tracking_number}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm space-x-2">
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
        <div className="hidden sm:block text-center py-8 text-gray-400">No orders found</div>
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
