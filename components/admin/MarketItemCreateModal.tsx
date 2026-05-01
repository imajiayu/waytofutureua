'use client'

import { useState } from 'react'

import { createMarketItem } from '@/app/actions/market-admin'
import { useAsyncForm } from '@/lib/hooks/useAsyncForm'
import type { CreateMarketItemInput } from '@/lib/market/market-validations'
import type { I18nText } from '@/types'
import type { MarketItem } from '@/types/market'

import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'
import AdminButton from './ui/AdminButton'
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

  const {
    loading,
    error,
    onSubmit: handleSubmit,
  } = useAsyncForm(
    async () => {
      const { item, error: err } = await createMarketItem(formData)
      if (err) throw new Error(err)
      if (item) onCreated(item)
    },
    { fallbackError: 'Failed to create item' }
  )

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
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Item'}
          </AdminButton>
        </div>
      </form>
    </AdminBaseModal>
  )
}
