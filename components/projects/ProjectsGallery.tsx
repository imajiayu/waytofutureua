'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProjectStats } from '@/types'
import { isBodyScrollLocked } from '@/lib/hooks/useBodyScrollLock'
import ProjectCard from './ProjectCard'

interface ProjectsGalleryProps {
  // Project data
  projects: ProjectStats[]
  locale: string

  // Display mode
  mode?: 'full' | 'compact'  // 'full' for home page, 'compact' for donate page

  // Selection state (for compact mode)
  selectedProjectId?: number | null
  onProjectSelect?: (id: number) => void

  // Show header
  showHeader?: boolean
}

export default function ProjectsGallery({
  projects,
  locale,
  mode = 'full',
  selectedProjectId,
  onProjectSelect,
  showHeader = false,
}: ProjectsGalleryProps) {
  const t = useTranslations(mode === 'compact' ? 'donate' : 'home')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scroll-based collapse/expand for compact mode
  // Default: all cards expanded. Scroll down: collapse. Scroll to top: expand.
  const [isCollapsedByScroll, setIsCollapsedByScroll] = useState(false)

  useEffect(() => {
    // Only enable scroll detection in compact mode
    if (mode !== 'compact') return

    const SCROLL_THRESHOLD = 50 // px from top to consider "at top"
    let lastScrollY = window.scrollY
    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      if (isBodyScrollLocked()) return
      ticking = true

      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY

        // Scroll down past threshold -> collapse
        if (currentScrollY > lastScrollY && currentScrollY > SCROLL_THRESHOLD) {
          setIsCollapsedByScroll(true)
        }
        // Scroll to top -> expand
        else if (currentScrollY <= SCROLL_THRESHOLD) {
          setIsCollapsedByScroll(false)
        }

        lastScrollY = currentScrollY
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [mode])

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('noProjects')}</p>
      </div>
    )
  }

  return (
    <section className={`
      ${mode === 'compact' ? 'pt-4 pb-2 md:pt-6 md:pb-3' : ''}
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        {/* Header - Only show when explicitly requested and not in compact mode */}
        {showHeader && mode !== 'compact' && (
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-display">
              {t('hero.projects.title')}
            </h2>
            <p className="text-gray-600 text-lg">
              {t('hero.projects.subtitle')}
            </p>
          </div>
        )}

        {/* Horizontal Scrolling Container */}
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 pt-6 scrollbar-hide"
          >
            <div className="flex items-start gap-6 min-w-min px-2 py-2">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  locale={locale}
                  mode={mode}
                  showProgress={true}
                  isSelected={selectedProjectId === project.id}
                  onSelect={onProjectSelect}
                  forceCollapse={mode === 'compact' ? isCollapsedByScroll : false}
                />
              ))}
            </div>
          </div>

          {/* Scroll Hint */}
          <div className={`text-center ${mode === 'compact' ? 'mt-2' : 'mt-4'}`}>
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('scrollToViewAll')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
