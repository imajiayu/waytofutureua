'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@/components/icons'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  snapPoints?: number[] // Percentages of viewport height [min, mid, max]
  title?: string
  minimizedHint: string // Text to show when minimized
  hideWhenMinimized?: boolean // Hide completely when minimized (to show footer)
  expandTrigger?: number // Increment to trigger expand (used for external control)
}

// Constants
const NAV_BAR_HEIGHT = 64 // px - height of navigation bar
const MINIMIZED_HEIGHT = 64 // px - height of minimized button bar
const DRAG_THRESHOLD_RATIO = 0.1 // 10% of viewport height

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  snapPoints = [0.15, 1], // Two states: minimized and full
  title,
  minimizedHint,
  hideWhenMinimized = false,
  expandTrigger,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [currentSnap, setCurrentSnap] = useState(0) // Start minimized
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)

  // Calculate snap point in pixels
  const getSnapHeight = useCallback((snapIndex: number) => {
    const vh = window.innerHeight
    if (snapIndex === 1) {
      // Full screen: height to just below the navigation bar
      return vh - NAV_BAR_HEIGHT
    }
    // Minimized: fixed height for the button bar only
    return MINIMIZED_HEIGHT
  }, [])

  const isMinimized = currentSnap === 0
  const isExpanded = currentSnap === 1

  // Handle drag start
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true)
    setStartY(clientY)
    setCurrentY(clientY)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false)

    const dragDistance = currentY - startY
    const vh = window.innerHeight
    const dragThreshold = vh * DRAG_THRESHOLD_RATIO

    // Toggle between minimized and expanded based on drag direction
    if (dragDistance > dragThreshold) {
      // Dragged down - minimize
      setCurrentSnap(0)
    } else if (dragDistance < -dragThreshold) {
      // Dragged up - expand
      setCurrentSnap(1)
    }
  }, [currentY, startY])

  // Toggle between minimized and expanded
  const toggleSheet = useCallback(() => {
    setCurrentSnap(prev => (prev === 0 ? 1 : 0))
  }, [])

  // External expand trigger
  useEffect(() => {
    if (expandTrigger && expandTrigger > 0) {
      setCurrentSnap(1)
    }
  }, [expandTrigger])

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleDragStart(e.clientY)
    },
    [handleDragStart]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleDragStart(e.touches[0].clientY)
    },
    [handleDragStart]
  )

  // Add/remove event listeners for drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setCurrentY(e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      setCurrentY(e.touches[0].clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    const handleTouchEnd = () => {
      handleDragEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, handleDragEnd])

  // Lock body scroll when sheet is expanded (mobile only)
  useEffect(() => {
    const MOBILE_BREAKPOINT = 1024

    const updateScrollLock = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT
      if (isOpen && isExpanded && isMobile) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'unset'
      }
    }

    updateScrollLock()
    window.addEventListener('resize', updateScrollLock)

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('resize', updateScrollLock)
    }
  }, [isOpen, isExpanded])

  if (!isOpen) return null

  // Hide completely when minimized and hideWhenMinimized is true
  const shouldHide = isMinimized && hideWhenMinimized

  const currentHeight = getSnapHeight(currentSnap)

  // Spring-like cubic bezier for smooth, bouncy animation
  const springTransition = 'cubic-bezier(0.32, 0.72, 0, 1)'

  // 拖拽时的偏移量
  const dragOffset = isDragging ? Math.max(0, currentY - startY) : 0

  return (
    <>
      {/* CTA Button - 在 Liquid Glass 上方，使用 calc 额外偏移 */}
      {isMinimized && !shouldHide && (
        <div
          className="fixed left-0 right-0 z-40 cursor-pointer select-none"
          onClick={toggleSheet}
          style={{
            // iOS 26 Liquid Glass 地址栏比 safe-area 更高
            // 使用 calc 在 safe-area 基础上额外偏移 20px
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          }}
        >
          <div
            className="flex items-center justify-center gap-3 py-4 px-6 bg-ukraine-gold-500 rounded-3xl mx-4"
            style={{
              boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.2)',
            }}
          >
            <ChevronUpIcon className="w-6 h-6 text-ukraine-blue-900" />
            <span className="text-ukraine-blue-900 font-bold text-lg">
              {minimizedHint}
            </span>
            <ChevronUpIcon className="w-6 h-6 text-ukraine-blue-900" />
          </div>
        </div>
      )}

      {/* Sheet - 展开时覆盖屏幕，收起时向下滑出 */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50"
        style={{
          height: `${currentHeight}px`,
          maxHeight: '95vh',
          // 用 translateY 实现向下滑动收起
          transform: isDragging
            ? `translateY(${dragOffset}px)`
            : isMinimized
              ? 'translateY(100%)'
              : 'translateY(0)',
          transition: isDragging
            ? 'none'
            : `transform 400ms ${springTransition}`,
          boxShadow: isExpanded
            ? '0 -8px 40px -12px rgba(0, 0, 0, 0.25), 0 -4px 16px -8px rgba(0, 0, 0, 0.1)'
            : 'none',
        }}
      >
        {/* Drag Handle - 向下箭头 */}
        <div
          className="cursor-pointer touch-none select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={toggleSheet}
        >
          <div className="pt-2 pb-1 flex items-center justify-center">
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto bg-white"
          style={{ height: 'calc(100% - 28px)' }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
