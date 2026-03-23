'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { UsersIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import type { SectionProps } from '../types'

interface TeamSectionProps extends Pick<SectionProps, 'content'> {
  employerImages: string[]
  onImageClick: (index: number) => void
}

export default function TeamSection({ content, employerImages, onImageClick }: TeamSectionProps) {
  const t = useTranslations('projects')
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (!content.team) {
    return null
  }

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-ukraine-gold-400 to-ukraine-gold-600 flex items-center justify-center shadow-md">
            <UsersIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg md:text-xl font-bold text-gray-900">
              {content.team.title}
            </h2>
            <p className="text-xs text-gray-500">{content.team.description}</p>
          </div>
        </div>
        {/* Carousel Controls */}
        <div className="hidden md:flex gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <ChevronRightIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Team Roles - Flowing Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {content.team.members.map((member, idx) => (
          <span
            key={idx}
            className="px-3 py-1.5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full text-xs md:text-sm text-gray-700 font-medium border border-slate-200 hover:border-ukraine-blue-300 hover:bg-ukraine-blue-50 transition-colors cursor-default"
          >
            {member}
          </span>
        ))}
      </div>

      {/* Team Photos Carousel */}
      {employerImages.length > 0 && (
        <div className="relative group">
          <div
            ref={scrollRef}
            className="flex gap-2 md:gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {employerImages.map((image, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                className="flex-shrink-0 w-28 md:w-36 snap-start cursor-pointer group/card"
                onClick={() => onImageClick(index)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(index) } }}
              >
                <div className="relative aspect-[3/4] rounded-lg md:rounded-xl overflow-hidden shadow-sm group-hover/card:shadow-md transition-shadow">
                  <Image
                    src={image}
                    alt={t('project0.teamMemberAlt', { number: index + 1 })}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                    sizes="(max-width: 768px) 112px, 144px"
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Mobile scroll hint */}
          <div className="md:hidden flex items-center justify-center gap-1.5 mt-2 text-gray-400">
            <ChevronRightIcon className="w-3 h-3 animate-pulse" />
            <span className="text-[10px]">{t('scrollToViewMore')}</span>
          </div>
        </div>
      )}
    </section>
  )
}
