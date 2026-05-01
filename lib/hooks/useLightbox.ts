'use client'

import { useCallback, useMemo, useState } from 'react'

import type { LightboxImage } from '@/components/common/ImageLightbox'

interface UseLightboxReturn {
  isOpen: boolean
  currentIndex: number
  open: (index: number) => void
  close: () => void
}

/**
 * Manage lightbox open/close state and current image index.
 * `open` signature matches the common `onImageClick: (index: number) => void` prop.
 */
export function useLightbox(): UseLightboxReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const open = useCallback((index: number) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return { isOpen, currentIndex, open, close }
}

/**
 * Wrap `useLightbox` with a memoized `LightboxImage[]` derived from a list of URLs.
 * Saves the boilerplate `useMemo<LightboxImage[]>(() => urls.map((url) => ({ url })), [urls])`
 * that appears in every Project detail page.
 */
export function useLightboxFromUrls(urls: ReadonlyArray<string> | null | undefined): {
  lightbox: UseLightboxReturn
  images: LightboxImage[]
} {
  const lightbox = useLightbox()
  const images = useMemo<LightboxImage[]>(() => (urls ? urls.map((url) => ({ url })) : []), [urls])
  return { lightbox, images }
}
