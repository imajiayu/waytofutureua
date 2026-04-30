'use client'

import { useState } from 'react'

import { updateMarketItem } from '@/app/actions/market-admin'
import type { I18nText } from '@/types'
import type { MarketItem } from '@/types/market'

import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'

interface Props {
  item: MarketItem
  onClose: () => void
  onSaved: (item: MarketItem) => void
}

export default function MarketItemEditModal({ item, onClose, onSaved }: Props) {
  const [formData, setFormData] = useState({
    title_i18n: item.title_i18n,
    fixed_price: item.fixed_price,
    currency: item.currency,
    stock_quantity: item.stock_quantity,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const updates: Partial<MarketItem> = {}
      if (JSON.stringify(formData.title_i18n) !== JSON.stringify(item.title_i18n)) {
        updates.title_i18n = formData.title_i18n
      }
      if (formData.fixed_price !== item.fixed_price) updates.fixed_price = formData.fixed_price
      if (formData.currency !== item.currency) updates.currency = formData.currency
      if (formData.stock_quantity !== item.stock_quantity)
        updates.stock_quantity = formData.stock_quantity

      if (Object.keys(updates).length === 0) {
        onClose()
        return
      }

      const { success, error: err } = await updateMarketItem(item.id, updates)
      if (err) {
        setError(err)
      } else if (success) {
        onSaved({ ...item, ...updates })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminBaseModal title="Edit Item" onClose={onClose} error={error} maxWidth="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <I18nFieldGroup
          title="Item Title"
          value={formData.title_i18n as I18nText}
          onChange={(v) => setFormData({ ...formData, title_i18n: v })}
          placeholders={{ en: 'Item name', zh: '商品名称', ua: 'Назва товару' }}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Price *</label>
            <input
              type="number"
              value={formData.fixed_price}
              onChange={(e) => setFormData({ ...formData, fixed_price: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
              min="0.01"
              step="0.01"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stock Quantity *</label>
            <input
              type="number"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
              min="1"
              step="1"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </AdminBaseModal>
  )
}
