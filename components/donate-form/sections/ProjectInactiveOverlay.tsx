'use client'

import { useTranslations } from 'next-intl'

export default function ProjectInactiveOverlay() {
  const t = useTranslations('donate')

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-slate-900/60 backdrop-blur-sm">
      <div className="mx-4 max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-8 w-8 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h3 className="mb-2 font-display text-xl font-bold text-gray-900">
          {t('formCard.cannotDonateNow')}
        </h3>
        <p className="text-sm text-gray-600">{t('formCard.projectNotActive')}</p>
      </div>
    </div>
  )
}
