'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import type { ProjectResult } from '@/types'
import type { LightboxImage } from '@/components/common/ImageLightbox'

// P2 优化: 动态加载灯箱组件，减少初始 bundle
const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

interface ProjectResultsMasonryProps {
  results: ProjectResult[]
  /** Optional: all results for lightbox (useful when displaying subset but want full gallery in lightbox) */
  allResultsForLightbox?: ProjectResult[]
  className?: string
}

type ImageSize = 'small' | 'medium' | 'large' | 'xlarge'

interface MasonryItem extends ProjectResult {
  size: ImageSize
}

// Get CSS classes based on image size
const getSizeClasses = (size: ImageSize): string => {
  switch (size) {
    case 'small':
      return 'col-span-1 row-span-1'
    case 'medium':
      return 'col-span-1 row-span-2'
    case 'large':
      return 'col-span-2 row-span-2'
    case 'xlarge':
      return 'col-span-2 row-span-2'
    default:
      return 'col-span-1 row-span-1'
  }
}

// Convert priority to image size
const getSizeFromPriority = (priority?: number): ImageSize => {
  const p = priority ?? 5 // Default priority is 5

  if (p >= 10) return 'xlarge'  // Only priority 10 gets xlarge
  if (p >= 8) return 'large'    // Priority 8-9 gets large
  if (p >= 5) return 'medium'   // Priority 5-7 gets medium
  return 'small'                // Priority <5 gets small
}

export default function ProjectResultsMasonry({
  results,
  allResultsForLightbox,
  className = '',
}: ProjectResultsMasonryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Use allResultsForLightbox if provided, otherwise use results
  const lightboxSourceResults = allResultsForLightbox || results

  // Assign sizes to results based on priority
  const masonryItems = useMemo<MasonryItem[]>(() => {
    return results.map((result) => ({
      ...result,
      size: getSizeFromPriority(result.priority),
    }))
  }, [results])

  // Prepare images for lightbox (use full list if provided)
  const lightboxImages = useMemo<LightboxImage[]>(
    () =>
      lightboxSourceResults.map((result) => ({
        url: result.imageUrl,
        caption: result.caption,
        alt: result.caption,
      })),
    [lightboxSourceResults]
  )

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (results.length === 0) {
    return null
  }

  return (
    <>
      <div className={`w-full ${className}`}>
        {/* Masonry Grid */}
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 auto-rows-[80px] md:auto-rows-[100px] gap-1.5 md:gap-3 grid-flow-dense">
          {masonryItems.map((item, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              className={`${getSizeClasses(item.size)} group relative overflow-hidden rounded-lg cursor-pointer`}
              onClick={() => openLightbox(index)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(index) } }}
            >
              {/* Image */}
              <Image
                src={item.imageUrl}
                alt={item.caption || `Result ${index + 1}`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              />
            </div>
          ))}
        </div>
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
    </>
  )
}
