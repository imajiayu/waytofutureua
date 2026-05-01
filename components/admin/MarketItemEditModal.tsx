'use client'

import { useState } from 'react'

import { updateMarketItem } from '@/app/actions/market-admin'
import { useAsyncForm } from '@/lib/hooks/useAsyncForm'
import type { I18nText } from '@/types'
import type { MarketItem } from '@/types/market'

import AdminBaseModal from './AdminBaseModal'
import I18nFieldGroup from './I18nFieldGroup'
import AdminButton from './ui/AdminButton'
import { TextField } from './ui/FormField'

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

  const {
    loading,
    error,
    onSubmit: handleSubmit,
  } = useAsyncForm(
    async () => {
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
      if (err) throw new Error(err)
      if (success) onSaved({ ...item, ...updates })
    },
    { fallbackError: 'Failed to update item' }
  )

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
          <TextField
            label="Price"
            type="number"
            required
            min={0.01}
            step={0.01}
            value={formData.fixed_price}
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
            {loading ? 'Saving...' : 'Save Changes'}
          </AdminButton>
        </div>
      </form>
    </AdminBaseModal>
  )
}
