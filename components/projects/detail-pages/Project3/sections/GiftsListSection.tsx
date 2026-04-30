'use client'

import { useTranslations } from 'next-intl'

import { GiftIcon } from '@/components/icons'

import { GiftListAccordion } from '../components'
import type { SectionProps } from '../types'

interface GiftsListSectionProps extends Pick<SectionProps, 'content'> {
  expandedShelters: Set<number>
  onToggleShelter: (index: number) => void
}

export default function GiftsListSection({
  content,
  expandedShelters,
  onToggleShelter,
}: GiftsListSectionProps) {
  const t = useTranslations('projects')

  if (!content?.giftsList) {
    return null
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-christmas-gold to-amber-500 shadow-md">
          <GiftIcon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-gray-900 md:text-lg">
            {t('project3.childrenWishes')}
          </h2>
          <p className="text-[10px] text-gray-500 md:text-xs">{t('project3.childrenWishesDesc')}</p>
        </div>
      </div>
      <div className="space-y-2">
        {content.giftsList.map((giftList, idx) => (
          <GiftListAccordion
            key={idx}
            giftList={giftList}
            isExpanded={expandedShelters.has(idx)}
            onToggle={() => onToggleShelter(idx)}
          />
        ))}
      </div>
    </section>
  )
}
