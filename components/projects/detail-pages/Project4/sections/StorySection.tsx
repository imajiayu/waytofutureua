'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { SectionHeader } from '@/components/projects/shared'

import type { SectionProps } from '../types'

interface StorySectionProps extends SectionProps {
  onTalentImageClick?: (index: number) => void
}

export default function StorySection({ content, onTalentImageClick }: StorySectionProps) {
  const t = useTranslations('projects.project4')
  const { talents, artworkImage } = content.childrenTalents

  return (
    <section>
      <SectionHeader
        title={content.childrenTalents.title}
        gradientClassName="from-violet-400 to-purple-500"
        className="mb-4"
      />

      {/* Description */}
      <p className="mb-5 leading-relaxed text-gray-700">{content.childrenTalents.description}</p>

      {/* Talents Grid: 3 talent cards + 1 artwork showcase */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Talent Cards */}
        {talents.map((talent, idx) => (
          <div
            key={idx}
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer overflow-hidden rounded-xl"
            onClick={() => onTalentImageClick?.(idx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTalentImageClick?.(idx)
              }
            }}
          >
            {/* Image */}
            <div className="relative aspect-[4/5]">
              <Image
                src={talent.image}
                alt={talent.activity}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>

            {/* Activity Label */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <span className="inline-block rounded-lg bg-white/95 px-2.5 py-1 text-sm font-medium text-violet-700 shadow-sm backdrop-blur-sm">
                {talent.activity}
              </span>
            </div>
          </div>
        ))}

        {/* Artwork Showcase - Special card */}
        {artworkImage && (
          <div
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer overflow-hidden rounded-xl"
            onClick={() => onTalentImageClick?.(talents.length)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onTalentImageClick?.(talents.length)
              }
            }}
          >
            <div className="relative aspect-[4/5]">
              <Image
                src={artworkImage}
                alt={t('artworkCollectionAlt')}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Special gradient for artwork */}
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/70 via-purple-900/20 to-transparent" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
