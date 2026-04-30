'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRef } from 'react'

import { ChevronLeftIcon, ChevronRightIcon, UsersIcon } from '@/components/icons'

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
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ukraine-gold-400 to-ukraine-gold-600 shadow-md md:h-9 md:w-9">
            <UsersIcon className="h-4 w-4 text-white md:h-5 md:w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-gray-900 md:text-xl">
              {content.team.title}
            </h2>
            <p className="text-xs text-gray-500">{content.team.description}</p>
          </div>
        </div>
        {/* Carousel Controls */}
        <div className="hidden gap-1.5 md:flex">
          <button
            onClick={() => scroll('left')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
          >
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
          >
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Team Roles - Flowing Tags */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {content.team.members.map((member, idx) => (
          <span
            key={idx}
            className="cursor-default rounded-full border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-ukraine-blue-300 hover:bg-ukraine-blue-50 md:text-sm"
          >
            {member}
          </span>
        ))}
      </div>

      {/* Team Photos Carousel */}
      {employerImages.length > 0 && (
        <div className="group relative">
          <div
            ref={scrollRef}
            className="scrollbar-hide flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 md:gap-3"
          >
            {employerImages.map((image, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                className="group/card w-28 flex-shrink-0 cursor-pointer snap-start md:w-36"
                onClick={() => onImageClick(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onImageClick(index)
                  }
                }}
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-sm transition-shadow group-hover/card:shadow-md md:rounded-xl">
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
          <div className="mt-2 flex items-center justify-center gap-1.5 text-gray-400 md:hidden">
            <ChevronRightIcon className="h-3 w-3 animate-pulse" />
            <span className="text-[10px]">{t('scrollToViewMore')}</span>
          </div>
        </div>
      )}
    </section>
  )
}
