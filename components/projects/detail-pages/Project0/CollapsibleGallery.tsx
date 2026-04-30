'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ChevronDownIcon } from '@/components/icons'
import ProjectResultsMasonry from '@/components/projects/shared/ProjectResultsMasonry'
import type { ProjectResult } from '@/types'

interface CollapsibleGalleryProps {
  results: ProjectResult[]
  className?: string
}

// Collapsed height in pixels
const COLLAPSED_HEIGHT_MOBILE = 160
const COLLAPSED_HEIGHT_DESKTOP = 200

export default function CollapsibleGallery({ results, className = '' }: CollapsibleGalleryProps) {
  const t = useTranslations('projects')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  const galleryRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Get collapsed height based on screen size
  const getCollapsedHeight = useCallback(() => {
    if (typeof window === 'undefined') return COLLAPSED_HEIGHT_MOBILE
    return window.innerWidth >= 768 ? COLLAPSED_HEIGHT_DESKTOP : COLLAPSED_HEIGHT_MOBILE
  }, [])

  // Measure content height when expanded
  useEffect(() => {
    if (contentRef.current && isExpanded) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [isExpanded, results])

  const handleExpand = useCallback(() => {
    if (isAnimating) return

    setIsAnimating(true)

    // First, measure the full content height
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }

    // Then expand
    setIsExpanded(true)

    // Animation complete
    setTimeout(() => {
      setIsAnimating(false)
    }, 500)
  }, [isAnimating])

  const handleCollapse = useCallback(() => {
    if (isAnimating || !galleryRef.current) return

    setIsAnimating(true)

    // Calculate where to scroll
    const galleryTop = galleryRef.current.getBoundingClientRect().top + window.scrollY
    const headerOffset = 80
    const targetScroll = Math.max(0, galleryTop - headerOffset)

    // Collapse content and scroll simultaneously
    setIsExpanded(false)
    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    })

    // Animation complete after the longer of the two animations
    setTimeout(() => {
      setIsAnimating(false)
    }, 450)
  }, [isAnimating])

  const toggleExpand = useCallback(() => {
    if (isExpanded) {
      handleCollapse()
    } else {
      handleExpand()
    }
  }, [isExpanded, handleExpand, handleCollapse])

  const photoCount = results.length - 12
  const hasMorePhotos = results.length > 12

  // Calculate the style for the content container
  const getContentStyle = () => {
    if (!hasMorePhotos) return {}

    const collapsedHeight = getCollapsedHeight()

    if (isExpanded) {
      return {
        maxHeight: contentHeight ? `${contentHeight}px` : '5000px',
        transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }
    }

    return {
      maxHeight: `${collapsedHeight}px`,
      transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }
  }

  return (
    <div ref={galleryRef} className={`relative ${className}`}>
      {/* Gallery Container with smooth height transition */}
      <div ref={contentRef} className="relative overflow-hidden" style={getContentStyle()}>
        <ProjectResultsMasonry results={results} allResultsForLightbox={results} />
      </div>

      {/* Gradient Overlay with fade transition */}
      {hasMorePhotos && (
        <div
          className={`pointer-events-none absolute -bottom-1 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/95 to-transparent transition-opacity duration-300 ease-out md:h-28 ${isExpanded ? 'opacity-0' : 'opacity-100'} `}
        />
      )}

      {/* Toggle Button with micro-interactions */}
      {hasMorePhotos && (
        <div
          className={`flex justify-center transition-all duration-300 ${isExpanded ? 'mt-4' : 'relative -top-4 mt-1'} `}
        >
          <button
            onClick={toggleExpand}
            disabled={isAnimating}
            className={`group relative flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-xs text-gray-700 shadow-sm transition-all duration-300 ease-out hover:border-ukraine-blue-400 hover:text-ukraine-blue-600 hover:shadow-md active:scale-95 md:text-sm ${isAnimating ? 'cursor-wait opacity-80' : 'cursor-pointer'} `}
          >
            {/* Photo count badge with scale animation */}
            <span
              className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ukraine-blue-500 text-[10px] font-bold text-white shadow-sm transition-all duration-300 ease-out ${
                isExpanded ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
              } `}
            >
              +{photoCount}
            </span>

            <span className="font-medium">{isExpanded ? t('showLess') : t('viewAllPhotos')}</span>

            {/* Animated arrow icon */}
            <span
              className={`inline-flex transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180' : 'rotate-0'} `}
            >
              <ChevronDownIcon className="h-4 w-4" />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
