'use client'

import { useRef, useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import type { LightboxImage } from '@/components/common/ImageLightbox'

// P2 优化: 动态加载灯箱组件
const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

interface EmployeeCarouselProps {
  images: string[]
  title?: string
  className?: string
  locale?: string
}

export default function EmployeeCarousel({
  images,
  title,
  className = '',
  locale = 'en',
}: EmployeeCarouselProps) {
  const t = useTranslations('projects')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Prepare images for lightbox
  const lightboxImages = useMemo<LightboxImage[]>(
    () => images.map((url) => ({ url })),
    [images]
  )

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300 // Scroll by 300px
      const newScrollLeft = scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount)

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      })
    }
  }

  if (images.length === 0) {
    return null
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Title */}
      {title && (
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 font-display">
          {title}
        </h3>
      )}

      {/* Gallery Container */}
      <div className="relative group">
        {/* Scrollable Images Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {images.map((image, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              className="flex-shrink-0 w-40 md:w-48 snap-start cursor-pointer"
              onClick={() => openLightbox(index)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(index) } }}
            >
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-md">
                <Image
                  src={image}
                  alt={`Team member ${index + 1}`}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="(max-width: 768px) 160px, 192px"
                  priority={index < 3}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            {/* Previous Button */}
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 md:p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
              aria-label="Scroll left"
            >
              <ChevronLeftIcon className="w-5 h-5 md:w-6 md:h-6" />
            </button>

            {/* Next Button */}
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 md:p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
              aria-label="Scroll right"
            >
              <ChevronRightIcon className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}
      </div>

      {/* Scroll Hint */}
      <div className="mt-3 text-center text-xs md:text-sm text-gray-500">
        <span className="hidden md:inline">← </span>
        <span className="md:hidden">👈 </span>
        {t('scrollToViewMore')}
        <span className="hidden md:inline"> →</span>
        <span className="md:hidden"> 👉</span>
      </div>

      {/* Lightbox - 仅在打开时渲染，配合动态导入减少初始加载 */}
      {lightboxOpen && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  )
}
