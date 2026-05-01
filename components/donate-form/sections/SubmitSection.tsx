'use client'

import { useTranslations } from 'next-intl'

import type { ProjectStats } from '@/types'

interface Props {
  isCreating: boolean
  projectStatus: ProjectStats['status']
}

export default function SubmitSection({ isCreating, projectStatus }: Props) {
  const t = useTranslations('donate')

  return (
    <>
      <button
        type="submit"
        disabled={isCreating || projectStatus !== 'active'}
        className={`group relative w-full overflow-hidden rounded-xl px-6 py-3 font-semibold shadow-md transition-all duration-300 ${
          projectStatus !== 'active'
            ? 'cursor-not-allowed bg-gray-400 text-white'
            : 'bg-ukraine-gold-500 text-ukraine-blue-900 hover:bg-ukraine-gold-600 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500'
        }`}
      >
        <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
        <span className="relative z-10">
          {projectStatus !== 'active' ? t('formCard.projectEnded') : t('submit')}
        </span>
      </button>

      <p className="text-center text-sm font-medium text-ukraine-gold-700">{t('networkNotice')}</p>
    </>
  )
}
