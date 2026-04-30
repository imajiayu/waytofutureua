'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface SectionNavItem {
  id: string
  label: string
}

interface SectionNavProps {
  sections: SectionNavItem[]
  activeSectionId: string | null
  className?: string
}

const GAP = 12

// Track the position and size of the active pill for the sliding indicator
interface IndicatorStyle {
  left: number
  width: number
  opacity: number
}

export default function SectionNav({ sections, activeSectionId, className }: SectionNavProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [clickOverride, setClickOverride] = useState<string | null>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [indicator, setIndicator] = useState<IndicatorStyle>({ left: 0, width: 0, opacity: 0 })
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isStuck, setIsStuck] = useState(false)

  const displayActiveId = clickOverride ?? activeSectionId

  // Cleanup click timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    }
  }, [])

  // Detect sticky state via scroll position
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const stickyTop = parseFloat(getComputedStyle(container).top) || 0

    const handleScroll = () => {
      setIsStuck(container.getBoundingClientRect().top <= stickyTop + 1)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Update sliding indicator position
  useLayoutEffect(() => {
    if (!displayActiveId || !scrollContainerRef.current) {
      setIndicator((prev) => ({ ...prev, opacity: 0 }))
      return
    }

    const pill = pillRefs.current.get(displayActiveId)
    if (!pill) return

    const container = scrollContainerRef.current
    const containerRect = container.getBoundingClientRect()
    const pillRect = pill.getBoundingClientRect()

    setIndicator({
      left: pillRect.left - containerRect.left + container.scrollLeft,
      width: pillRect.width,
      opacity: 1,
    })

    if (!hasInitialized) {
      // Skip transition on first render
      requestAnimationFrame(() => setHasInitialized(true))
    }
  }, [displayActiveId, sections, hasInitialized])

  // Auto-scroll the active pill into view
  useEffect(() => {
    if (!displayActiveId) return
    const pill = pillRefs.current.get(displayActiveId)
    if (pill && scrollContainerRef.current) {
      pill.scrollIntoView({
        inline: 'center',
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [displayActiveId])

  const handleClick = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId)
    const nav = containerRef.current
    if (!element || !nav) return

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
    setClickOverride(sectionId)
    clickTimerRef.current = setTimeout(() => setClickOverride(null), 1200)

    const offset = nav.getBoundingClientRect().bottom + GAP
    const targetTop = element.getBoundingClientRect().top + window.scrollY - offset

    window.scrollTo({ top: targetTop, behavior: 'smooth' })
  }, [])

  const setPillRef = useCallback((id: string, el: HTMLButtonElement | null) => {
    if (el) {
      pillRefs.current.set(id, el)
    } else {
      pillRefs.current.delete(id)
    }
  }, [])

  if (sections.length === 0) return null

  return (
    <div ref={containerRef} className={cn('sticky top-[8.5rem] z-40 md:top-[5.5rem]', className)}>
      {/* Rectangular mask behind rounded container — only when stuck */}
      {isStuck && (
        <div
          className="absolute -top-8 bottom-0 left-0 right-0 -z-10 bg-slate-50"
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'relative',
          'rounded-2xl bg-white/95 backdrop-blur-md',
          'border border-ukraine-blue-100/60 shadow-[0_2px_12px_-2px_rgba(7,108,179,0.08)]'
        )}
      >
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide relative flex items-center gap-1 overflow-x-auto px-1.5 py-1.5"
        >
          {/* Sliding indicator */}
          <div
            className={cn(
              'absolute top-1.5 h-[calc(100%-12px)] rounded-xl',
              'bg-gradient-to-r from-ukraine-blue-500 to-ukraine-blue-600',
              'shadow-[0_1px_4px_rgba(7,108,179,0.3)]',
              hasInitialized ? 'transition-all duration-300 ease-out' : ''
            )}
            style={{
              left: indicator.left,
              width: indicator.width,
              opacity: indicator.opacity,
            }}
          />

          {sections.map((section) => {
            const isActive = section.id === displayActiveId
            return (
              <button
                key={section.id}
                ref={(el) => setPillRef(section.id, el)}
                onClick={() => handleClick(section.id)}
                className={cn(
                  'relative z-10 flex-shrink-0',
                  'px-4 py-2 md:py-1.5',
                  'font-display text-xs font-semibold tracking-wide md:text-sm',
                  'whitespace-nowrap rounded-xl',
                  'transition-colors duration-300',
                  isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-ukraine-blue-600 active:text-ukraine-blue-700'
                )}
              >
                {section.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
