import type { I18nText } from '@/types'

interface I18nFieldGroupProps {
  title: string
  value: I18nText | null | undefined
  onChange: (newValue: I18nText) => void
  placeholders?: { en?: string; zh?: string; ua?: string }
}

const langs = [
  { code: 'en' as const, label: 'English (en)' },
  { code: 'zh' as const, label: 'Chinese (zh)' },
  { code: 'ua' as const, label: 'Ukrainian (ua)' },
]

export default function I18nFieldGroup({ title, value, onChange, placeholders }: I18nFieldGroupProps) {
  const current = (value as I18nText) || {}

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="grid grid-cols-1 gap-3">
        {langs.map(({ code, label }) => (
          <div key={code}>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {label}
            </label>
            <input
              type="text"
              value={current[code] || ''}
              onChange={(e) => onChange({ ...current, [code]: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder={placeholders?.[code] || ''}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
