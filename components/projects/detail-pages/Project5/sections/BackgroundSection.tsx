import { SectionHeader } from '@/components/projects/shared'

import type { BackgroundContent } from '../types'

interface BackgroundSectionProps {
  background: BackgroundContent
}

export default function BackgroundSection({ background }: BackgroundSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl bg-white p-5 shadow-sm md:rounded-2xl md:p-8">
      <SectionHeader
        title={background.title}
        gradientClassName="from-orange-400 to-amber-500"
        className="mb-4"
      />

      {/* Paragraphs */}
      <div className="space-y-4">
        {background.paragraphs.map((paragraph, idx) => (
          <p key={idx} className="text-sm leading-relaxed text-gray-700 md:text-base">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}
