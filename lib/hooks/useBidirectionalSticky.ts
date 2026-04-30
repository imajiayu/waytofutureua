import { type RefObject, useEffect, useState } from 'react'

interface UseBidirectionalStickyOptions {
  /** Element whose height drives the sticky calculation. */
  innerRef: RefObject<HTMLElement | null>
  /** Top offset (e.g. fixed nav height) in px. Defaults to 96. */
  navHeight?: number
  /** Padding from viewport bottom in px. Defaults to 40. */
  bottomPadding?: number
  /** Min viewport width (px) to enable bidirectional sticky. Defaults to 1024 (lg). */
  desktopBreakpoint?: number
  /** Re-run when these change (e.g. selectedProjectId). */
  deps?: ReadonlyArray<unknown>
}

/**
 * Bidirectional sticky positioning for sidebars taller than the viewport.
 *
 * Behavior:
 * - When sidebar fits in viewport, it sticks to `navHeight` from top.
 * - When taller, it scrolls in sync with page scroll until it reaches either
 *   edge (top = navHeight, bottom = viewport height - sidebar height - padding),
 *   so both ends become reachable without dead zones.
 * - Resets to top when sidebar height changes significantly (>50px), to avoid
 *   stale positions after form-state-driven height changes.
 *
 * Returns the current `top` value in px to apply to the sticky element.
 */
export function useBidirectionalSticky({
  innerRef,
  navHeight = 96,
  bottomPadding = 40,
  desktopBreakpoint = 1024,
  deps = [],
}: UseBidirectionalStickyOptions): number {
  const [stickyTop, setStickyTop] = useState(navHeight)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let lastScrollY = window.scrollY
    let currentTop = navHeight
    let ticking = false
    let lastSidebarHeight = 0

    const updatePosition = () => {
      const sidebarInner = innerRef.current
      if (!sidebarInner || window.innerWidth < desktopBreakpoint) {
        setStickyTop(navHeight)
        ticking = false
        return
      }

      const scrollY = window.scrollY
      const scrollDelta = scrollY - lastScrollY
      const viewportHeight = window.innerHeight
      const sidebarHeight = sidebarInner.offsetHeight

      // Reset position if sidebar height changed significantly (form state changed)
      if (Math.abs(sidebarHeight - lastSidebarHeight) > 50) {
        currentTop = navHeight
        lastSidebarHeight = sidebarHeight
      }

      // If sidebar is shorter than available viewport, just stick to top
      if (sidebarHeight <= viewportHeight - navHeight - bottomPadding) {
        setStickyTop(navHeight)
        lastScrollY = scrollY
        ticking = false
        return
      }

      // Sidebar is taller than viewport - bidirectional sticky
      const minTop = viewportHeight - sidebarHeight - bottomPadding
      const maxTop = navHeight

      currentTop = currentTop - scrollDelta
      currentTop = Math.max(minTop, Math.min(maxTop, currentTop))

      setStickyTop(currentTop)

      lastScrollY = scrollY
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updatePosition)
        ticking = true
      }
    }

    lastSidebarHeight = innerRef.current?.offsetHeight || 0
    updatePosition()

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updatePosition)

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updatePosition)
    })
    const observed = innerRef.current
    if (observed) {
      resizeObserver.observe(observed)
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updatePosition)
      resizeObserver.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is the explicit re-run trigger
  }, [innerRef, navHeight, bottomPadding, desktopBreakpoint, ...deps])

  return stickyTop
}
