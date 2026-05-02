'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

import type { LightboxImage } from '@/components/common/ImageLightbox'
import ImageLightbox from '@/components/common/LazyImageLightbox'
import type { ProjectResult } from '@/types'

import ProjectResultsMasonry from './ProjectResultsMasonry'

export interface ResultImage {
  imageUrl: string
  orientation?: 'landscape' | 'portrait'
  aspectRatio?: number
  priority?: number
  caption?: string
}

export interface UnifiedResultsSectionProps {
  title: string
  icon: React.ReactNode
  gradient: string
  images: ResultImage[]
  getAltText: (index: number) => string
  headerDecoration?: React.ReactNode
  layoutThreshold?: number
}

/** aspect ratio (w / h) from image metadata */
function getItemRatio(item: ResultImage): number {
  if (item.aspectRatio) return item.aspectRatio
  return (item.orientation || 'landscape') === 'portrait' ? 9 / 16 : 16 / 9
}

/** Pack images into rows where each row's aspect-ratio sum stays under the target */
function packIntoRows(items: ResultImage[], targetRatioSum = 2.5): number[][] {
  const rows: number[][] = []
  let currentRow: number[] = []
  let currentSum = 0

  items.forEach((item, idx) => {
    const ratio = getItemRatio(item)
    if (currentRow.length > 0 && currentSum + ratio > targetRatioSum) {
      rows.push(currentRow)
      currentRow = [idx]
      currentSum = ratio
    } else {
      currentRow.push(idx)
      currentSum += ratio
    }
  })
  if (currentRow.length > 0) rows.push(currentRow)
  return rows
}

export default function UnifiedResultsSection({
  title,
  icon,
  gradient,
  images,
  headerDecoration,
  layoutThreshold = 6,
  getAltText,
}: UnifiedResultsSectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const useMasonry = images.length > layoutThreshold

  const lightboxImages = useMemo<LightboxImage[]>(
    () => images.map((img) => ({ url: img.imageUrl, caption: img.caption })),
    [images]
  )

  const rows = useMemo(() => (useMasonry ? [] : packIntoRows(images)), [images, useMasonry])

  const masonryResults = useMemo<ProjectResult[]>(
    () =>
      useMasonry
        ? images.map((img) => ({
            imageUrl: img.imageUrl,
            caption: img.caption || '',
            priority: img.priority,
          }))
        : [],
    [images, useMasonry]
  )

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  if (images.length === 0) return null

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:rounded-3xl">
        {/* Header */}
        <div
          className={`relative bg-gradient-to-r ${gradient} overflow-hidden px-3 py-2.5 md:px-4 md:py-3`}
        >
          {headerDecoration}
          <div className="relative z-10 flex items-center gap-2">
            {icon}
            <h2 className="font-display text-lg font-bold text-white md:text-xl">{title}</h2>
          </div>
        </div>

        {/* Gallery */}
        <div className="p-3 md:p-4">
          {useMasonry ? (
            <ProjectResultsMasonry results={masonryResults} />
          ) : (
            <div className="space-y-2.5 md:space-y-3">
              {rows.map((rowIndices, rowIdx) => (
                <div key={rowIdx} className="flex flex-col gap-2.5 sm:flex-row md:gap-3">
                  {rowIndices.map((idx) => {
                    const item = images[idx]
                    const ratio = getItemRatio(item)

                    return (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        className="group relative min-w-0 cursor-pointer overflow-hidden rounded-xl"
                        style={{ flex: `${Math.round(ratio * 100)} 1 0%` }}
                        onClick={() => openLightbox(idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            openLightbox(idx)
                          }
                        }}
                      >
                        <Image
                          src={item.imageUrl}
                          alt={getAltText(idx)}
                          width={800}
                          height={Math.round(800 / ratio)}
                          className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for row-packing mode (masonry has its own) */}
      {!useMasonry && lightboxOpen && (
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
