'use client'

import { useCallback, useState } from 'react'

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
