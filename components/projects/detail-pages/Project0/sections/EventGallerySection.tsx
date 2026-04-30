'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import type { SectionProps } from '../types'

interface EventGallerySectionProps extends Pick<SectionProps, 'content'> {
  onImageClick: (index: number) => void
}

export default function EventGallerySection({ content, onImageClick }: EventGallerySectionProps) {
  const t = useTranslations('projects')

  if (!content.images || content.images.length === 0) {
    return null
  }

  return (
    <section>
      <div className="grid grid-cols-12 gap-2 md:gap-3">
        {/* Large Feature Image */}
        <div
          role="button"
          tabIndex={0}
          className="group relative col-span-8 row-span-2 aspect-[4/3] cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
          onClick={() => onImageClick(0)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onImageClick(0)
            }
          }}
        >
          <Image
            src={content.images[0]}
            alt={t('project0.eventImageAlt', { number: 1 })}
            fill
            sizes="(max-width: 768px) 66vw, 50vw"
            className="object-cover transition-all duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        {/* Smaller Images */}
        {content.images.slice(1, 3).map((img, idx) => (
          <div
            key={idx}
            role="button"
            tabIndex={0}
            className="group relative col-span-4 aspect-square cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
            onClick={() => onImageClick(idx + 1)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onImageClick(idx + 1)
              }
            }}
          >
            <Image
              src={img}
              alt={t('project0.eventImageAlt', { number: idx + 2 })}
              fill
              sizes="(max-width: 768px) 33vw, 25vw"
              className="object-cover transition-all duration-500 group-hover:scale-105"
            />
          </div>
        ))}
        {/* Bottom Row */}
        {content.images.slice(3, 6).map((img, idx) => (
          <div
            key={idx}
            role="button"
            tabIndex={0}
            className="group relative col-span-4 aspect-[4/3] cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
            onClick={() => onImageClick(idx + 3)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onImageClick(idx + 3)
              }
            }}
          >
            <Image
              src={img}
              alt={t('project0.eventImageAlt', { number: idx + 4 })}
              fill
              sizes="(max-width: 768px) 33vw, 25vw"
              className="object-cover transition-all duration-500 group-hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
