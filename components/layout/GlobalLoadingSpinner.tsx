'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface GlobalLoadingSpinnerProps {
  isLoading: boolean
  loadingText?: string // Optional custom loading text
}

export default function GlobalLoadingSpinner({
  isLoading,
  loadingText,
}: GlobalLoadingSpinnerProps) {
  const [mounted, setMounted] = useState(false)

  // Try to use translations if available, otherwise use custom text or default fallback
  let displayText = loadingText || 'Loading...'

  try {
    const t = useTranslations('common')
    displayText = loadingText || t('loading')
  } catch {
    // If translations are not available (e.g., in admin pages), use the fallback
  }

  // Mount check for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent body scroll when loading spinner is visible
  useEffect(() => {
    if (isLoading) {
      // Save current scroll position
      const scrollY = window.scrollY

      // Prevent scrolling
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'

      return () => {
        // Restore scrolling
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''

        // For page navigation: scroll to top of new page
        window.scrollTo(0, 0)
      }
    }
  }, [isLoading])

  if (!isLoading || !mounted) return null

  const spinnerContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Spinning loader */}
      <div className="relative mb-4 h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-white/30"></div>
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-white"></div>
      </div>

      {/* Loading text */}
      <p className="text-lg font-medium text-white">{displayText}</p>
    </div>
  )

  // Use portal to render at body level, escaping any transform containers
  return createPortal(spinnerContent, document.body)
}
