'use client'

import { useTranslations } from 'next-intl'
import type { ShippingAddress } from '@/types/market'

interface ShippingAddressFormProps {
  value: ShippingAddress
  onChange: (address: ShippingAddress) => void
  errors?: Partial<Record<keyof ShippingAddress, string>>
  disabled?: boolean
}

export default function ShippingAddressForm({
  value,
  onChange,
  errors,
  disabled = false,
}: ShippingAddressFormProps) {
  const t = useTranslations('market.shipping')

  const update = <K extends keyof ShippingAddress>(key: K, val: ShippingAddress[K]) => {
    onChange({ ...value, [key]: val })
  }

  const inputClass = (field: keyof ShippingAddress) =>
    `w-full px-4 py-3 border rounded-lg text-gray-900
     focus:ring-2 focus:ring-ukraine-blue-500 focus:border-transparent
     disabled:bg-gray-50 disabled:text-gray-400
     ${errors?.[field] ? 'border-warm-400' : 'border-gray-300'}`

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        {t('title')}
      </h3>

      {/* 收件人 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">{t('name')}</label>
        <input
          type="text"
          value={value.name}
          onChange={e => update('name', e.target.value)}
          disabled={disabled}
          className={inputClass('name')}
          autoComplete="name"
        />
        {errors?.name && <p className="mt-1 text-sm text-warm-600">{errors.name}</p>}
      </div>

      {/* 地址行 1 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">{t('addressLine1')}</label>
        <input
          type="text"
          value={value.address_line1}
          onChange={e => update('address_line1', e.target.value)}
          disabled={disabled}
          className={inputClass('address_line1')}
          autoComplete="address-line1"
        />
        {errors?.address_line1 && <p className="mt-1 text-sm text-warm-600">{errors.address_line1}</p>}
      </div>

      {/* 地址行 2 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">{t('addressLine2')}</label>
        <input
          type="text"
          value={value.address_line2 || ''}
          onChange={e => update('address_line2', e.target.value || undefined)}
          disabled={disabled}
          className={inputClass('address_line2')}
          autoComplete="address-line2"
        />
      </div>

      {/* 城市 + 州/省 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">{t('city')}</label>
          <input
            type="text"
            value={value.city}
            onChange={e => update('city', e.target.value)}
            disabled={disabled}
            className={inputClass('city')}
            autoComplete="address-level2"
          />
          {errors?.city && <p className="mt-1 text-sm text-warm-600">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">{t('state')}</label>
          <input
            type="text"
            value={value.state || ''}
            onChange={e => update('state', e.target.value || undefined)}
            disabled={disabled}
            className={inputClass('state')}
            autoComplete="address-level1"
          />
        </div>
      </div>

      {/* 邮编 + 国家 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">{t('postalCode')}</label>
          <input
            type="text"
            value={value.postal_code}
            onChange={e => update('postal_code', e.target.value)}
            disabled={disabled}
            className={inputClass('postal_code')}
            autoComplete="postal-code"
          />
          {errors?.postal_code && <p className="mt-1 text-sm text-warm-600">{errors.postal_code}</p>}
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">{t('country')}</label>
          <input
            type="text"
            value={value.country}
            onChange={e => update('country', e.target.value.toUpperCase().slice(0, 2))}
            disabled={disabled}
            placeholder="US"
            maxLength={2}
            className={inputClass('country')}
            autoComplete="country"
          />
          {errors?.country && <p className="mt-1 text-sm text-warm-600">{errors.country}</p>}
        </div>
      </div>
    </div>
  )
}
