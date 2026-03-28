'use client'

import Image from 'next/image'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useState, useEffect } from 'react'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'

interface MosaicItem {
  imageUrl: string
  projectId: number
  // Desktop 12-col grid placement
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}

// 20 images from project donation results sections:
// P0 donationResults ×2, P3 results ×17, P5 donationResults ×1
// Desktop layout: 12 cols × 8 rows, all 96 cells covered
const MOSAIC_ITEMS: MosaicItem[] = [
  // Row 1-2 (3+2+3+2+2 = 12)
  { imageUrl: '/images/projects/project-3/results/activity-2.webp', projectId: 3, colStart: 1, colEnd: 4, rowStart: 1, rowEnd: 3 },
  { imageUrl: '/images/projects/project-0/result/result15.webp', projectId: 0, colStart: 4, colEnd: 6, rowStart: 1, rowEnd: 3 },
  { imageUrl: '/images/projects/project-3/results/activity-3.webp', projectId: 3, colStart: 6, colEnd: 9, rowStart: 1, rowEnd: 3 },
  { imageUrl: '/images/projects/project-3/results/activity-4.webp', projectId: 3, colStart: 9, colEnd: 11, rowStart: 1, rowEnd: 3 },
  { imageUrl: '/images/projects/project-3/results/activity-6.webp', projectId: 3, colStart: 11, colEnd: 13, rowStart: 1, rowEnd: 3 },

  // Row 3-4 (2+4+2+2+2 = 12)
  { imageUrl: '/images/projects/project-3/results/activity-5.webp', projectId: 3, colStart: 1, colEnd: 3, rowStart: 3, rowEnd: 5 },
  { imageUrl: '/images/projects/project-3/results/activity-7.webp', projectId: 3, colStart: 3, colEnd: 7, rowStart: 3, rowEnd: 5 },
  { imageUrl: '/images/projects/project-5/details/results/result1.webp', projectId: 5, colStart: 7, colEnd: 9, rowStart: 3, rowEnd: 5 },
  { imageUrl: '/images/projects/project-3/results/activity-8.webp', projectId: 3, colStart: 9, colEnd: 11, rowStart: 3, rowEnd: 5 },
  { imageUrl: '/images/projects/project-0/result/result16.webp', projectId: 0, colStart: 11, colEnd: 13, rowStart: 3, rowEnd: 5 },

  // Row 5-6 (2+3+2+2+3 = 12)
  { imageUrl: '/images/projects/project-3/results/activity-12.webp', projectId: 3, colStart: 1, colEnd: 3, rowStart: 5, rowEnd: 7 },
  { imageUrl: '/images/projects/project-3/results/activity-16.webp', projectId: 3, colStart: 3, colEnd: 6, rowStart: 5, rowEnd: 7 },
  { imageUrl: '/images/projects/project-3/results/activity-18.webp', projectId: 3, colStart: 6, colEnd: 8, rowStart: 5, rowEnd: 7 },
  { imageUrl: '/images/projects/project-3/results/activity-22.webp', projectId: 3, colStart: 8, colEnd: 10, rowStart: 5, rowEnd: 7 },
  { imageUrl: '/images/projects/project-3/results/activity-20.webp', projectId: 3, colStart: 10, colEnd: 13, rowStart: 5, rowEnd: 7 },

  // Row 7-8 (3+2+3+2+2 = 12)
  { imageUrl: '/images/projects/project-3/results/activity-25.webp', projectId: 3, colStart: 1, colEnd: 4, rowStart: 7, rowEnd: 9 },
  { imageUrl: '/images/projects/project-3/results/activity-30.webp', projectId: 3, colStart: 4, colEnd: 6, rowStart: 7, rowEnd: 9 },
  { imageUrl: '/images/projects/project-3/results/activity-35.webp', projectId: 3, colStart: 6, colEnd: 9, rowStart: 7, rowEnd: 9 },
  { imageUrl: '/images/projects/project-3/results/activity-38.webp', projectId: 3, colStart: 9, colEnd: 11, rowStart: 7, rowEnd: 9 },
  { imageUrl: '/images/projects/project-3/results/activity-41.webp', projectId: 3, colStart: 11, colEnd: 13, rowStart: 7, rowEnd: 9 },
]

export default function ProjectResultsMosaic() {
  const router = useRouter()
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  const handleClick = (projectId: number) => {
    setIsNavigating(true)
    router.push(`/donate?project=${projectId}`)
  }

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />

      {/* Desktop: 12-col mosaic with art-directed placements */}
      <div
        className="hidden lg:grid w-full"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: 'repeat(8, calc(100vw / 16))',
        }}
      >
        {MOSAIC_ITEMS.map((item) => (
          <div
            key={item.imageUrl}
            className="relative group cursor-pointer overflow-hidden"
            style={{
              gridColumn: `${item.colStart} / ${item.colEnd}`,
              gridRow: `${item.rowStart} / ${item.rowEnd}`,
            }}
            role="button"
            tabIndex={0}
            onClick={() => handleClick(item.projectId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(item.projectId)
              }
            }}
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 33vw, 50vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
          </div>
        ))}
      </div>

      {/* Mobile & Tablet: even grid, auto-flow */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 w-full lg:hidden">
        {MOSAIC_ITEMS.map((item) => (
          <div
            key={item.imageUrl}
            className="relative aspect-[3/2] group cursor-pointer overflow-hidden"
            role="button"
            tabIndex={0}
            onClick={() => handleClick(item.projectId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(item.projectId)
              }
            }}
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(min-width: 768px) 25vw, 50vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
          </div>
        ))}
      </div>
    </>
  )
}
