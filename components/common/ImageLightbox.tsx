'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { XIcon, ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from '@/components/icons'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import Image from 'next/image'

export interface LightboxImage {
  url: string
  caption?: string
  alt?: string
  isVideo?: boolean
  contentType?: string
  thumbnailUrl?: string | null
}

interface ImageLightboxProps {
  images: LightboxImage[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}

export default function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
}: ImageLightboxProps) {
  const t = useTranslations('common.lightbox')
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  // Client-side only mounting for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Focus management: capture trigger element and focus dialog on open
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
      // Use requestAnimationFrame to ensure the dialog is rendered before focusing
      requestAnimationFrame(() => {
        dialogRef.current?.focus()
      })
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [isOpen])

  // Update current index when initial index changes
  useEffect(() => {
    setCurrentIndex(initialIndex)
    setImageLoaded(false)
  }, [initialIndex])

  // Reset image loaded state when current index changes
  useEffect(() => {
    setImageLoaded(false)
  }, [currentIndex])

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  // Navigate to next image
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, goToPrevious, goToNext])

  // Touch swipe handling
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    // 阻止 Safari 橡皮筋效果
    e.preventDefault()
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) goToNext()
    if (isRightSwipe) goToPrevious()
  }

  // Prevent body scroll when lightbox is open
  useBodyScrollLock(isOpen)

  if (!isOpen || images.length === 0 || !mounted) return null

  const currentImage = images[currentIndex]

  const lightboxContent = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center touch-none outline-none"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label={t('close')}
      >
        <XIcon className="w-6 h-6" />
      </button>

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToPrevious()
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label={t('previousImage')}
        >
          <ChevronLeftIcon className="w-8 h-8" />
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            goToNext()
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label={t('nextImage')}
        >
          <ChevronRightIcon className="w-8 h-8" />
        </button>
      )}

      {/* Image/Video Container */}
      <div
        className="w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {currentImage.isVideo ? (
          <video
            src={currentImage.url}
            controls
            autoPlay
            className="max-w-[calc(100vw-80px)] max-h-[calc(100vh-80px)] rounded-lg object-contain"
          />
        ) : (
          <>
            {/* Thumbnail placeholder (if available) - shown while loading */}
            {!imageLoaded && currentImage.thumbnailUrl && (
              <img
                src={currentImage.thumbnailUrl}
                alt={currentImage.alt || currentImage.caption || t('imageAlt', { index: currentIndex + 1 })}
                className="max-w-[calc(100vw-80px)] max-h-[calc(100vh-80px)] object-contain rounded-lg blur-sm"
              />
            )}

            {/* Main image */}
            <img
              src={currentImage.url}
              alt={currentImage.alt || currentImage.caption || t('imageAlt', { index: currentIndex + 1 })}
              className={`max-w-[calc(100vw-80px)] max-h-[calc(100vh-80px)] object-contain rounded-lg transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0 absolute'
              }`}
              onLoad={() => setImageLoaded(true)}
            />

            {/* Loading spinner - shown while loading */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2Icon className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Info - fixed at bottom */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
        {/* Caption */}
        {currentImage.caption && (
          <div className="max-w-3xl text-center bg-black/50 rounded-lg px-4 py-2">
            <p className="text-white text-sm md:text-base leading-relaxed">
              {currentImage.caption}
            </p>
          </div>
        )}

        {/* Progress Dots - Smart collapse when many images */}
        {images.length > 1 && (
          <div className="flex items-center gap-1.5 pointer-events-auto max-w-[80vw] justify-center">
            {images.map((_, index) => {
              // 计算当前点与选中点的距离
              const distance = Math.abs(index - currentIndex)

              // 图片少于等于 7 张时，显示所有点
              if (images.length <= 7) {
                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentIndex(index)
                    }}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-white w-6'
                        : 'bg-white/40 hover:bg-white/60 w-2'
                    }`}
                    aria-label={t('goToImage', { number: index + 1 })}
                  />
                )
              }

              // 图片多于 7 张时，智能折叠
              // 只显示当前点附近的 5 个点（current ± 2）
              // 边缘的点缩小显示
              const maxVisibleDistance = 2

              // 完全隐藏太远的点
              if (distance > maxVisibleDistance + 1) {
                return null
              }

              // 边缘点缩小
              const isEdge = distance === maxVisibleDistance + 1
              if (isEdge) {
                // 只在两端显示一个缩小的点作为提示
                const isStart = index < currentIndex && currentIndex > maxVisibleDistance
                const isEnd = index > currentIndex && currentIndex < images.length - maxVisibleDistance - 1
                if (!isStart && !isEnd) return null

                return (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      setCurrentIndex(index)
                    }}
                    className="w-1 h-1 rounded-full bg-white/30 transition-all"
                    aria-label={t('goToImage', { number: index + 1 })}
                  />
                )
              }

              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex(index)
                  }}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'bg-white w-6'
                      : distance <= 1
                        ? 'bg-white/40 hover:bg-white/60 w-2'
                        : 'bg-white/30 hover:bg-white/50 w-1.5'
                  }`}
                  aria-label={t('goToImage', { number: index + 1 })}
                />
              )
            })}
          </div>
        )}

        {/* Image Counter */}
        <div className="text-white/60 text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  )

  // Use Portal to render lightbox at document.body level
  // This ensures it's not affected by parent transform/filter/backdrop-filter
  return createPortal(lightboxContent, document.body)
}
