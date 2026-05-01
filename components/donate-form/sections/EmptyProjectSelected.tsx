'use client'

import { useTranslations } from 'next-intl'

export default function EmptyProjectSelected() {
  const t = useTranslations('donate')

  return (
    <div>
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ukraine-blue-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11l5-5m0 0l5 5m-5-5v12"
            />
          </svg>
        </div>
        <h3 className="mb-2 font-display text-lg font-semibold text-gray-700">
          {t('noProjectSelected')}
        </h3>
        <p className="text-sm text-gray-500">{t('formCard.noProjectDescription')}</p>
      </div>
    </div>
  )
}
