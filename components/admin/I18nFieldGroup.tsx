import type { I18nText } from '@/types'

type Locale = 'en' | 'zh' | 'ua'

interface I18nFieldGroupProps {
  title: string
  value: I18nText | null | undefined
  onChange: (newValue: I18nText) => void
  placeholders?: { en?: string; zh?: string; ua?: string }
  requiredLocale?: Locale
}

const langs: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English (en)' },
  { code: 'zh', label: 'Chinese (zh)' },
  { code: 'ua', label: 'Ukrainian (ua)' },
]

export default function I18nFieldGroup({
  title,
  value,
  onChange,
  placeholders,
  requiredLocale,
}: I18nFieldGroupProps) {
  const current = (value as I18nText) || {}

  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <h4 className="mb-3 text-sm font-semibold text-gray-700">{title}</h4>
      <div className="grid grid-cols-1 gap-3">
        {langs.map(({ code, label }) => {
          const isRequired = requiredLocale === code
          return (
            <div key={code}>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {label}
                {isRequired && <span className="ml-1 text-red-500">*</span>}
              </label>
              <input
                type="text"
                required={isRequired}
                value={current[code] || ''}
                onChange={(e) => onChange({ ...current, [code]: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder={placeholders?.[code] || ''}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
