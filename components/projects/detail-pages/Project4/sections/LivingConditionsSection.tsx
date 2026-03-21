'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { SectionHeader } from '@/components/projects/shared'
import type { SectionProps } from '../types'

interface LivingConditionsSectionProps extends SectionProps {
  onImageClick?: (index: number) => void
}

export default function LivingConditionsSection({ content, onImageClick }: LivingConditionsSectionProps) {
  const t = useTranslations('projects.project4')
  const defaultImages = [
    '/images/projects/project-4/details/wood-stove.webp',
    '/images/projects/project-4/details/desk.webp',
  ]
  const images = content.livingConditions.images || defaultImages

  // Status colors for each point
  const statusColors = ['bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-400']

  return (
    <section>
      <SectionHeader title={content.livingConditions.title} gradientClassName="from-stone-500 to-stone-700" className="mb-4" />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:items-stretch">
        {/* Left: Description + List */}
        <div className="flex flex-col justify-center space-y-4">
          <p className="text-gray-700 leading-relaxed">
            {content.livingConditions.description}
          </p>

          <ul className="space-y-2.5">
            {content.livingConditions.points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${statusColors[idx] || statusColors[0]}`} />
                <span className="text-sm text-gray-600 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: 2 Horizontal Images Stacked */}
        <div className="flex flex-col gap-2.5 lg:h-full">
          {images.slice(0, 2).map((img, idx) => (
            <div
              key={idx}
              className="relative aspect-[16/9] lg:aspect-auto lg:flex-1 rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => onImageClick?.(idx)}
            >
              <Image
                src={img}
                alt={idx === 0 ? t('woodStoveAlt') : t('studyAreaAlt')}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
