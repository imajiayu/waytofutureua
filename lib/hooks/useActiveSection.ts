'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tracks which section is currently visible in the viewport using IntersectionObserver.
 * Returns the id of the topmost visible section.
 *
 * Uses a generous rootMargin so that a section is considered "active" as soon as
 * its top enters the upper portion of the viewport (below the sticky nav + SectionNav).
 */
export function useActiveSection(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  const visibleMap = useRef<Map<string, IntersectionObserverEntry>>(new Map())

  useEffect(() => {
    if (sectionIds.length === 0) return

    const map = visibleMap.current
    map.clear()

    // Top margin: exclude sticky nav (~120px mobile, ~72px desktop).
    // Using -160px covers SectionNav height on both breakpoints.
    // Bottom margin: -40% means a section is "active" while in the top 60% of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            map.set(entry.target.id, entry)
          } else {
            map.delete(entry.target.id)
          }
        }

        // Pick the topmost visible section
        let topmost: string | null = null
        let minTop = Infinity
        for (const [id, entry] of map) {
          const top = entry.boundingClientRect.top
          if (top < minTop) {
            minTop = top
            topmost = id
          }
        }
        setActiveId(topmost)
      },
      {
        rootMargin: '-160px 0px -40% 0px',
        threshold: 0,
      }
    )

    for (const id of sectionIds) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }

    return () => {
      observer.disconnect()
      map.clear()
    }
  }, [JSON.stringify(sectionIds)]) // eslint-disable-line react-hooks/exhaustive-deps

  return activeId
}
