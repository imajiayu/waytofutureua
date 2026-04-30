'use client'

import { useTranslations } from 'next-intl'

import { MapPinIcon } from '@/components/icons'

import { ShelterCard } from '../components'
import type { SectionProps } from '../types'

export default function SheltersSection({ content, locale }: SectionProps) {
  const t = useTranslations('projects')

  if (!content?.shelters) {
    return null
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-christmas-berry to-rose-600 shadow-md">
          <MapPinIcon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-gray-900 md:text-lg">
            {t('project3.visitedFacilities')}
          </h2>
          <p className="text-[10px] text-gray-500 md:text-xs">
            {t('project3.visitedFacilitiesDesc')}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-3">
        {content.shelters.map((shelter, idx) => (
          <ShelterCard key={idx} shelter={shelter} index={idx} />
        ))}
      </div>
    </section>
  )
}
