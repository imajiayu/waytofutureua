'use client'

import { useTranslations } from 'next-intl'
import { UsersIcon, DollarSignIcon, GiftIcon } from '@/components/icons'
import { SectionHeader } from '@/components/projects/shared'
import { StatCard } from '../components'
import type { SectionProps } from '../types'

export default function StatisticsSection({ content }: Pick<SectionProps, 'content'>) {
  const t = useTranslations('projects')

  if (!content?.statistics) {
    return null
  }

  return (
    <section>
      <SectionHeader title={t('project3.programImpact')} gradientClassName="from-christmas-gold to-amber-500" size="sm" />
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <StatCard
          icon={UsersIcon}
          value={content.statistics.totalChildren}
          label={t('totalChildren')}
          colorScheme="berry"
        />
        <StatCard
          icon={DollarSignIcon}
          value={content.statistics.totalCost.usd}
          label={t('totalCost')}
          subLabel={`₴${content.statistics.totalCost.uah.toLocaleString()}`}
          prefix="$"
          colorScheme="pine"
        />
        <StatCard
          icon={GiftIcon}
          value={content.statistics.averagePerChild}
          label={t('perChild')}
          prefix="$"
          colorScheme="gold"
        />
      </div>
    </section>
  )
}
