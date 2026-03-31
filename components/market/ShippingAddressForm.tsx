'use client'

import { useTranslations } from 'next-intl'
import type { ShippingAddress } from '@/types/market'
import CountrySelect from '@/components/common/CountrySelect'
import PhoneInput from '@/components/common/PhoneInput'

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

  const hasCountry = value.country !== ''

  const update = <K extends keyof ShippingAddress>(key: K, val: ShippingAddress[K]) => {
    onChange({ ...value, [key]: val })
  }

  const inputBase = `w-full px-4 py-3 bg-gray-50/80 border rounded-xl text-gray-900 text-[15px]
     placeholder:text-gray-300
     focus:bg-white focus:ring-2 focus:ring-ukraine-blue-500/20 focus:border-ukraine-blue-400
     disabled:bg-gray-100 disabled:text-gray-400
     transition-all duration-200`

  const inputClass = (field: keyof ShippingAddress) =>
    `${inputBase} ${errors?.[field] ? 'border-warm-400 bg-warm-50/30' : 'border-gray-200'}`

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-600 tracking-wide">
          {t('title')}
        </h3>
      </div>

      {/* ① Country — first, sets context */}
      <div>
        <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('country')}</label>
        <CountrySelect
          value={value.country}
          onChange={code => update('country', code)}
          placeholder={t('selectCountry')}
          disabled={disabled}
          error={!!errors?.country}
        />
        {errors?.country && <p className="mt-1.5 text-xs text-warm-600">{errors.country}</p>}
      </div>

      {/* ②–⑥ Address fields — revealed after country is selected */}
      {hasCountry && (
        <div className="space-y-4 mkt-step-in">
          {/* ② Name */}
          <div>
            <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('name')}</label>
            <input
              type="text"
              value={value.name}
              onChange={e => update('name', e.target.value)}
              disabled={disabled}
              className={inputClass('name')}
              autoComplete="name"
            />
            {errors?.name && <p className="mt-1.5 text-xs text-warm-600">{errors.name}</p>}
          </div>

          {/* ③ Phone */}
          <div>
            <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('phone')}</label>
            <PhoneInput
              value={value.phone}
              onChange={val => update('phone', val)}
              defaultCountry={value.country.toLowerCase() || 'ua'}
              disabled={disabled}
              error={!!errors?.phone}
            />
            {errors?.phone && <p className="mt-1.5 text-xs text-warm-600">{errors.phone}</p>}
          </div>

          {/* ④ Address Line 1 */}
          <div>
            <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('addressLine1')}</label>
            <input
              type="text"
              value={value.address_line1}
              onChange={e => update('address_line1', e.target.value)}
              disabled={disabled}
              className={inputClass('address_line1')}
              autoComplete="address-line1"
            />
            {errors?.address_line1 && <p className="mt-1.5 text-xs text-warm-600">{errors.address_line1}</p>}
          </div>

          {/* ④ Address Line 2 (optional) */}
          <div>
            <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('addressLine2')}</label>
            <input
              type="text"
              value={value.address_line2 || ''}
              onChange={e => update('address_line2', e.target.value)}
              disabled={disabled}
              className={inputClass('address_line2')}
              autoComplete="address-line2"
            />
          </div>

          {/* ⑤ City + State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('city')}</label>
              <input
                type="text"
                value={value.city}
                onChange={e => update('city', e.target.value)}
                disabled={disabled}
                className={inputClass('city')}
                autoComplete="address-level2"
              />
              {errors?.city && <p className="mt-1.5 text-xs text-warm-600">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('state')}</label>
              <input
                type="text"
                value={value.state || ''}
                onChange={e => update('state', e.target.value)}
                disabled={disabled}
                className={inputClass('state')}
                autoComplete="address-level1"
              />
            </div>
          </div>

          {/* ⑥ Postal Code */}
          <div className="sm:w-1/2">
            <label className="block text-[13px] font-medium text-gray-500 mb-1.5">{t('postalCode')}</label>
            <input
              type="text"
              value={value.postal_code}
              onChange={e => update('postal_code', e.target.value)}
              disabled={disabled}
              className={inputClass('postal_code')}
              autoComplete="postal-code"
            />
            {errors?.postal_code && <p className="mt-1.5 text-xs text-warm-600">{errors.postal_code}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
