'use client'

import AnimatedNumber from '@/components/projects/shared/AnimatedNumber'

import type { SectionProps, Statistic } from '../types'

const STAT_CARD_GRADIENTS = [
  'bg-gradient-to-br from-ukraine-blue-500 to-ukraine-blue-700',
  'bg-gradient-to-br from-ukraine-gold-500 to-ukraine-gold-600',
  'bg-gradient-to-br from-slate-50 to-slate-200',
] as const

function AnimatedStatCard({ stat, index }: { stat: Statistic; index: number }) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl p-4 md:rounded-2xl md:p-5 ${STAT_CARD_GRADIENTS[index] ?? STAT_CARD_GRADIENTS[2]}`}
    >
      {/* Decorative Elements */}
      <div className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10" />

      <div className="relative z-10">
        <div
          className={`mb-1 font-data text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl ${index < 2 ? 'text-white' : 'text-gray-900'}`}
        >
          <AnimatedNumber
            value={stat.value}
            prefix={stat.isAmount ? '$' : ''}
            suffix={stat.isAmount ? '' : '+'}
            formatLargeNumber={!stat.isAmount}
          />
        </div>
        <div
          className={`mb-0.5 font-display text-xs font-semibold md:text-sm ${index < 2 ? 'text-white/90' : 'text-gray-800'}`}
        >
          {stat.label}
        </div>
        <div
          className={`text-[10px] leading-tight md:text-xs ${index < 2 ? 'text-white/70' : 'text-gray-600'}`}
        >
          {stat.description}
        </div>
      </div>
    </div>
  )
}

export default function StatisticsSection({ content }: Pick<SectionProps, 'content'>) {
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {Object.values(content.statistics).map((stat: Statistic, idx) => (
          <AnimatedStatCard key={idx} stat={stat} index={idx} />
        ))}
      </div>
    </section>
  )
}
