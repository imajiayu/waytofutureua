'use client'

import { useEffect, useState } from 'react'

interface Options {
  /** Distance (px) from document bottom that triggers `hide`. Defaults to 150. */
  footerSafeZone?: number
  /** Min viewport width below which the detector is active. Defaults to 1024 (lg). */
  mobileBreakpoint?: number
  /** Scroll handler debounce (ms). Defaults to 100. */
  debounceMs?: number
}

/**
 * Returns `true` when the viewport is within `footerSafeZone` px of the
 * document bottom on mobile, so callers can hide a fixed/minimized BottomSheet
 * to avoid overlapping the footer. Always `false` on desktop.
 */
export function useHideAtFooter({
  footerSafeZone = 150,
  mobileBreakpoint = 1024,
  debounceMs = 100,
}: Options = {}): boolean {
  const [hide, setHide] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeoutId: ReturnType<typeof setTimeout>

    const handleScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const distanceFromBottom = documentHeight - (scrollTop + windowHeight)
        setHide(distanceFromBottom < footerSafeZone)
      }, debounceMs)
    }

    const checkMobileAndAddListener = () => {
      window.removeEventListener('scroll', handleScroll)
      if (window.innerWidth < mobileBreakpoint) {
        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()
      } else {
        setHide(false)
      }
    }

    checkMobileAndAddListener()
    window.addEventListener('resize', checkMobileAndAddListener)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', checkMobileAndAddListener)
    }
  }, [footerSafeZone, mobileBreakpoint, debounceMs])

  return hide
}
