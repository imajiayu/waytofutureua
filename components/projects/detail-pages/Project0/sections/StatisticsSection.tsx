'use client'

import type { SectionProps, Statistic } from '../types'
import AnimatedNumber from '@/components/projects/shared/AnimatedNumber'

function AnimatedStatCard({ stat, index }: { stat: Statistic; index: number }) {
  return (
    <div
      className="relative p-4 md:p-5 rounded-xl md:rounded-2xl overflow-hidden group"
      style={{
        background:
          index === 0
            ? 'linear-gradient(135deg, #076CB3 0%, #054878 100%)'
            : index === 1
              ? 'linear-gradient(135deg, #F5B800 0%, #D19A00 100%)'
              : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      }}
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
