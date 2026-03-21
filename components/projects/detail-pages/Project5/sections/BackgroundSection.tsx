import { SectionHeader } from '@/components/projects/shared'
import type { BackgroundContent } from '../types'

interface BackgroundSectionProps {
  background: BackgroundContent
}

export default function BackgroundSection({ background }: BackgroundSectionProps) {
  return (
    <section className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden p-5 md:p-8">
      <SectionHeader title={background.title} gradientClassName="from-orange-400 to-amber-500" className="mb-4" />

      {/* Paragraphs */}
      <div className="space-y-4">
        {background.paragraphs.map((paragraph, idx) => (
          <p key={idx} className="text-sm md:text-base text-gray-700 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  )
}
