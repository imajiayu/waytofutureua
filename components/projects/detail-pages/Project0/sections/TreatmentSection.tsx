'use client'

import { ActivityIcon } from '@/components/icons'

import type { SectionProps } from '../types'

export default function TreatmentSection({ content }: Pick<SectionProps, 'content'>) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md md:h-9 md:w-9">
          <ActivityIcon className="h-4 w-4 text-white md:h-5 md:w-5" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-gray-900 md:text-xl">
            {content.treatmentPrograms.title}
          </h2>
          <p className="text-xs text-gray-500">{content.treatmentPrograms.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        {content.treatmentPrograms.programs.map((program, idx) => (
          <div
            key={idx}
            className="group relative rounded-lg border border-emerald-100 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-3 transition-all duration-300 hover:border-emerald-300 md:rounded-xl md:p-4"
          >
            <h3 className="mb-1 font-display text-xs font-bold text-gray-900 md:text-sm">
              {program.name}
            </h3>
            <p className="text-[10px] leading-relaxed text-gray-600 md:text-xs">
              {program.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
