'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { SectionHeader } from '@/components/projects/shared'

import type { SectionProps } from '../types'

interface SuccessStoriesSectionProps extends Pick<SectionProps, 'content'> {
  onImageClick: (index: number) => void
}

export default function SuccessStoriesSection({
  content,
  onImageClick,
}: SuccessStoriesSectionProps) {
  const t = useTranslations('projects')

  return (
    <section>
      <SectionHeader
        title={t('project0.storiesOfHope')}
        gradientClassName="from-ukraine-gold-500 to-amber-400"
      />

      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {content.successStories.map((story, idx) => (
          <div
            key={idx}
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
            onClick={() => onImageClick(idx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onImageClick(idx)
              }
            }}
          >
            <div className="relative">
              <Image
                src={story.image}
                alt={story.title}
                width={800}
                height={600}
                className="h-auto w-full transition-all duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-4">
                <h3 className="font-display text-xs font-bold leading-tight text-white md:text-sm">
                  {story.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
