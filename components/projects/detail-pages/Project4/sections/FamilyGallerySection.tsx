'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { SectionProps } from '../types'

interface FamilyGallerySectionProps extends SectionProps {
  onImageClick: (index: number) => void
}

export default function FamilyGallerySection({ content, onImageClick }: FamilyGallerySectionProps) {
  const t = useTranslations('projects.project4')
  const images = content.familyGallery.images

  // Separate images by priority
  const highPriority = images.filter((img) => img.priority === 'high')
  const mediumPriority = images.filter((img) => img.priority === 'medium')
  const lowPriority = images.filter((img) => img.priority === 'low')

  // Get original index for lightbox
  const getOriginalIndex = (url: string) => images.findIndex((img) => img.url === url)

  return (
    <section>
      {/* Masonry-style grid with varied sizes based on priority */}
      <div className="grid grid-cols-4 md:grid-cols-6 gap-2 auto-rows-[80px] md:auto-rows-[100px]">
        {/* High priority - large, spans 2 cols and 2 rows */}
        {highPriority.map((img) => (
          <div
            key={img.url}
            role="button"
            tabIndex={0}
            className="col-span-2 row-span-2 relative rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => onImageClick(getOriginalIndex(img.url))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(getOriginalIndex(img.url)) } }}
          >
            <Image
              src={img.url}
              alt={t('familyMomentAlt')}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}

        {/* Medium priority - medium size, spans 2 cols and 2 rows */}
        {mediumPriority.map((img) => (
          <div
            key={img.url}
            role="button"
            tabIndex={0}
            className="col-span-2 row-span-2 relative rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => onImageClick(getOriginalIndex(img.url))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(getOriginalIndex(img.url)) } }}
          >
            <Image
              src={img.url}
              alt={t('familyMomentAlt')}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}

        {/* Low priority - small, 1 col 1 row on mobile, spans appropriately on desktop */}
        {lowPriority.map((img, idx) => (
          <div
            key={img.url}
            role="button"
            tabIndex={0}
            className={`relative rounded-xl overflow-hidden cursor-pointer group ${
              idx === 0 ? 'col-span-2 row-span-1' : 'col-span-1 row-span-1'
            }`}
            onClick={() => onImageClick(getOriginalIndex(img.url))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(getOriginalIndex(img.url)) } }}
          >
            <Image
              src={img.url}
              alt={t('familyMomentAlt')}
              fill
              sizes="(max-width: 768px) 25vw, 16vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </div>
        ))}
      </div>
    </section>
  )
}
