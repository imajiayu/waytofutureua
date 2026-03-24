'use client'

import type { SectionProps, Statistic } from '../types'
import AnimatedNumber from '@/components/projects/shared/AnimatedNumber'

const STAT_CARD_GRADIENTS = [
  'bg-gradient-to-br from-ukraine-blue-500 to-ukraine-blue-700',
  'bg-gradient-to-br from-ukraine-gold-500 to-ukraine-gold-600',
  'bg-gradient-to-br from-slate-50 to-slate-200',
] as const

function AnimatedStatCard({ stat, index }: { stat: Statistic; index: number }) {
  return (
    <div
      className={`relative p-4 md:p-5 rounded-xl md:rounded-2xl overflow-hidden group ${STAT_CARD_GRADIENTS[index] ?? STAT_CARD_GRADIENTS[2]}`}
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10">
        <div
          className={`font-data text-3xl md:text-4xl lg:text-5xl font-bold mb-1 tracking-tight ${index < 2 ? 'text-white' : 'text-gray-900'}`}
        >
          <AnimatedNumber
            value={stat.value}
            prefix={stat.isAmount ? '$' : ''}
            suffix={stat.isAmount ? '' : '+'}
            formatLargeNumber={!stat.isAmount}
          />
        </div>
        <div
          className={`font-display text-xs md:text-sm font-semibold mb-0.5 ${index < 2 ? 'text-white/90' : 'text-gray-800'}`}
        >
          {stat.label}
        </div>
        <div
          className={`text-[10px] md:text-xs leading-tight ${index < 2 ? 'text-white/70' : 'text-gray-600'}`}
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
