'use client'

import { ORDER_STATUS_COLORS } from '@/lib/market/market-status'
import type { AdminMarketOrder, MarketOrderStatus } from '@/types/market'

interface Props {
  order: AdminMarketOrder
  itemTitle: string
}

export default function MarketOrderInfoPanel({ order, itemTitle }: Props) {
  const currentStatus = order.status as MarketOrderStatus
  return (
    <div className="mb-6 rounded-lg bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <span className="font-medium text-gray-600">Buyer:</span>
          <span className="ml-2 text-gray-900">{order.buyer_email}</span>
        </div>
        <div>
          <span className="font-medium text-gray-600">Item:</span>
          <span className="ml-2 text-gray-900">{itemTitle}</span>
        </div>
        <div>
          <span className="font-medium text-gray-600">Amount:</span>
          <span className="ml-2 text-gray-900">
            {order.quantity} × ${order.unit_price} = ${order.total_amount}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-600">Status:</span>
          <span
            className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[currentStatus].bg} ${ORDER_STATUS_COLORS[currentStatus].text}`}
          >
            {currentStatus}
          </span>
        </div>
        {order.tracking_number && (
          <div>
            <span className="font-medium text-gray-600">Tracking:</span>
            <span className="ml-2 font-mono text-xs text-gray-900">{order.tracking_number}</span>
            {order.tracking_carrier && (
              <span className="ml-1 text-gray-500">({order.tracking_carrier})</span>
            )}
          </div>
        )}
        <div>
          <span className="font-medium text-gray-600">Shipping:</span>
          <span className="ml-2 text-gray-900">
            {order.shipping_name}, {order.shipping_city}, {order.shipping_country}
          </span>
        </div>
      </div>
    </div>
  )
}
