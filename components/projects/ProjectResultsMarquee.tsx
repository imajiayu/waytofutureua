'use client'

import { useMemo, useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import type { ProjectResult } from '@/types'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'

interface ProjectResultsMarqueeProps {
  results: ProjectResult[]
  rowCount?: number // Number of rows (default: 3)
  pixelsPerSecond?: number // Scroll speed in pixels per second (default: 50)
  className?: string
}

// Image dimensions for calculating animation duration
const IMAGE_WIDTH_MOBILE = 280
const IMAGE_WIDTH_DESKTOP = 350
const GAP = 16 // gap-4 = 16px

export default function ProjectResultsMarquee({
  results,
  rowCount = 3,
  pixelsPerSecond = 50, // Fixed scroll speed
  className = '',
}: ProjectResultsMarqueeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  // Reset loading state when pathname changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  // Sort results by priority (higher priority first) and distribute across rows
  const rows = useMemo(() => {
    // Sort by priority (descending), default priority is 5
    const sortedResults = [...results].sort((a, b) => {
      const priorityA = a.priority ?? 5
      const priorityB = b.priority ?? 5
      return priorityB - priorityA
    })

    const rowArrays: ProjectResult[][] = Array.from({ length: rowCount }, () => [])
    sortedResults.forEach((result, index) => {
      rowArrays[index % rowCount].push(result)
    })
    return rowArrays
  }, [results, rowCount])

  // Calculate animation duration for each row based on fixed speed
  // We use desktop width as the reference since it's the larger size
  const getAnimationDuration = (itemCount: number) => {
    if (itemCount === 0) return 0
    // Total width of one set of items (we scroll through one set, then it repeats)
    const rowWidth = itemCount * (IMAGE_WIDTH_DESKTOP + GAP)
    // Duration = distance / speed
    return rowWidth / pixelsPerSecond
  }

  const handleImageClick = (projectId?: number) => {
    if (projectId) {
      setIsNavigating(true)
      router.push(`/donate?project=${projectId}`)
    }
  }

  if (results.length === 0) {
    return null
  }

  return (
    <>
      <div className={`w-full overflow-hidden ${className}`}>
        <div className="space-y-4 md:space-y-6">
          {rows.map((rowResults, rowIndex) => {
            // Skip empty rows
            if (rowResults.length === 0) return null

            // Determine scroll direction (alternate rows)
            const isReverse = rowIndex % 2 === 1
            const animationName = isReverse ? 'marquee-reverse' : 'marquee'

            // Calculate duration based on row item count for consistent speed
            const duration = getAnimationDuration(rowResults.length)

            // Duplicate items for seamless infinite scroll
            const duplicatedItems = [...rowResults, ...rowResults]

            return (
              <div
                key={rowIndex}
                className="relative"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
                }}
              >
                <div
                  className="flex gap-4 hover:pause-animation"
                  style={{
                    animation: `${animationName} ${duration}s linear infinite`,
                    width: 'fit-content',
                  }}
                >
                  {duplicatedItems.map((result, itemIndex) => {
                    return (
                      <div
                        key={`${rowIndex}-${itemIndex}`}
                        role="button"
                        tabIndex={0}
                        className="flex-shrink-0 group cursor-pointer"
                        onClick={() => handleImageClick(result.projectId)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleImageClick(result.projectId) } }}
                      >
                        <div className="relative w-[280px] md:w-[350px] h-[180px] md:h-[220px] rounded-lg overflow-hidden shadow-lg">
                          {/* Image */}
                          <Image
                            src={result.imageUrl}
                            alt={result.caption || `Result ${itemIndex + 1}`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            sizes="350px"
                          />

                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                          {/* Caption (Always Visible) */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                            <p className="text-white text-xs md:text-sm font-medium leading-tight line-clamp-2">
                              {result.caption}
                            </p>
                          </div>

                          {/* Hover Effect */}
                          <div className="absolute inset-0 bg-ukraine-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Keyframe Animations */}
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        @keyframes marquee-reverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }

        .hover\:pause-animation:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Global Loading Spinner */}
      <GlobalLoadingSpinner isLoading={isNavigating} />
    </>
  )
}
