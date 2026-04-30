'use client'

import { useTranslations } from 'next-intl'

import type { SectionProps } from '../types'

export default function ChallengesSection({ content }: Pick<SectionProps, 'content'>) {
  const t = useTranslations('projects')

  const challengeStats = [
    { value: '30', label: t('project0.challenges.centers') },
    { value: '27K', label: t('project0.challenges.patientsPerYear') },
    { value: '360K', label: t('project0.challenges.injured') },
    { value: '13.5', label: t('project0.challenges.yearsWait') },
  ]

  return (
    <section className="relative -mx-4 overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-4 md:-mx-6 md:rounded-2xl md:px-5 md:py-5">
      <div className="relative z-10">
        <h2 className="mb-2 font-display text-base font-bold text-white md:text-lg">
          {content.challenges.title}
        </h2>
        <p className="mb-4 text-xs leading-relaxed text-gray-300 md:text-sm">
          {content.challenges.content[0]}
        </p>

        {/* Challenge Stats Grid */}
        <div className="mb-4 grid grid-cols-4 gap-2 md:gap-3">
          {challengeStats.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-center md:p-3"
            >
              <div className="font-data text-lg font-bold text-red-400 md:text-2xl">
                {item.value}
              </div>
              <div className="text-[10px] text-gray-400 md:text-xs">{item.label}</div>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-gray-300 md:text-sm">
          {content.challenges.content[2]}
        </p>
      </div>
    </section>
  )
}
