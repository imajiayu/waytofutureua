'use client'

import { useState } from 'react'

import { createMarketItem } from '@/app/actions/market-admin'
import type { CreateMarketItemInput } from '@/lib/market/market-validations'
import type { I18nText } from '@/types'
import type { MarketItem } from '@/types/market'

import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'
import { TextField } from './ui/FormField'

interface Props {
  onClose: () => void
  onCreated: (item: MarketItem) => void
}

export default function MarketItemCreateModal({ onClose, onCreated }: Props) {
  const [formData, setFormData] = useState<CreateMarketItemInput>({
    title_i18n: {},
    fixed_price: 0,
    currency: 'USD',
    stock_quantity: 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { item, error: err } = await createMarketItem(formData)
      if (err) {
        setError(err)
      } else if (item) {
        onCreated(item)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminBaseModal title="Create New Item" onClose={onClose} error={error} maxWidth="3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <I18nFieldGroup
          title="Item Title"
          value={formData.title_i18n as I18nText}
          onChange={(v) => setFormData({ ...formData, title_i18n: v })}
          placeholders={{ en: 'Item name', zh: '商品名称', ua: 'Назва товару' }}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            label="Price"
            type="number"
            required
            min={0.01}
            step={0.01}
            value={formData.fixed_price || ''}
            onChange={(v) => setFormData({ ...formData, fixed_price: Number(v) })}
          />
          <TextField
            label="Currency"
            value={formData.currency}
            onChange={(v) => setFormData({ ...formData, currency: v })}
          />
          <TextField
            label="Stock Quantity"
            type="number"
            required
            min={1}
            step={1}
            value={formData.stock_quantity}
            onChange={(v) => setFormData({ ...formData, stock_quantity: Number(v) })}
          />
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
            {loading ? 'Creating...' : 'Create Item'}
          </button>
        </div>
      </form>
    </AdminBaseModal>
  )
}
