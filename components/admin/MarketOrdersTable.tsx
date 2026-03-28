'use client'

import { useState } from 'react'
import { ORDER_STATUS_COLORS, getNextOrderStatuses, needsTrackingNumber } from '@/lib/market/market-status'
import { formatMarketPrice } from '@/lib/market/market-utils'
import { getAdminMarketOrders, updateMarketOrderStatus } from '@/app/actions/market-admin'
import type { MarketOrder, MarketOrderStatus } from '@/types/market'

interface MarketOrdersTableProps {
  initialOrders: MarketOrder[]
}

export default function MarketOrdersTable({ initialOrders }: MarketOrdersTableProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [trackingInput, setTrackingInput] = useState<{ orderId: number; number: string; carrier: string } | null>(null)

  const refresh = async () => {
    const { orders: fresh } = await getAdminMarketOrders()
    setOrders(fresh)
  }

  const handleStatusUpdate = async (orderId: number, currentStatus: MarketOrderStatus, newStatus: MarketOrderStatus) => {
    // 发货需要快递单号
    if (needsTrackingNumber(currentStatus, newStatus)) {
      setTrackingInput({ orderId, number: '', carrier: '' })
      return
    }

    setActionLoading(orderId)
    await updateMarketOrderStatus(orderId, newStatus)
    await refresh()
    setActionLoading(null)
  }

  const handleShipWithTracking = async () => {
    if (!trackingInput || !trackingInput.number) return
    setActionLoading(trackingInput.orderId)
    await updateMarketOrderStatus(trackingInput.orderId, 'shipped', {
      tracking_number: trackingInput.number,
      tracking_carrier: trackingInput.carrier || undefined,
    })
    setTrackingInput(null)
    await refresh()
    setActionLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Tracking number input modal */}
      {trackingInput && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-sm font-medium text-blue-900">
            Enter tracking number for order #{trackingInput.orderId}
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Tracking number"
              value={trackingInput.number}
              onChange={e => setTrackingInput({ ...trackingInput, number: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Carrier (optional)"
              value={trackingInput.carrier}
              onChange={e => setTrackingInput({ ...trackingInput, carrier: e.target.value })}
              className="w-40 px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleShipWithTracking}
              disabled={!trackingInput.number}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Ship
            </button>
            <button
              onClick={() => setTrackingInput(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map(order => {
              const colors = ORDER_STATUS_COLORS[order.status]
              const nextStatuses = getNextOrderStatuses(order.status)
              return (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{order.order_reference}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{order.buyer_email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{order.item_id}</td>
                  <td className="px-4 py-3 text-sm font-data">
                    {formatMarketPrice(order.total_amount, 'USD')}
                    {order.quantity > 1 && <span className="text-gray-400 ml-1">×{order.quantity}</span>}
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
                    {nextStatuses.map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(order.id, order.status, status)}
                        disabled={actionLoading === order.id}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50 capitalize"
                      >
                        → {status}
                      </button>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {orders.length === 0 && (
        <div className="text-center py-8 text-gray-400">No orders found</div>
      )}
    </div>
  )
}
