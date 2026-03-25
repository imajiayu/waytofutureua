'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import ProjectProgressSection from '@/components/projects/shared/ProjectProgressSection'
import { FadeInSection, SectionNav } from '@/components/projects/shared'
import { useActiveSection } from '@/lib/hooks/useActiveSection'
import { useTranslations } from 'next-intl'
import { useProjectContent } from '@/lib/hooks/useProjectContent'
import { useLightbox } from '@/lib/hooks/useLightbox'
import type { Project5Content, Project5DetailContentProps } from './types'
import { HeroSection, BackgroundSection, EventsSection } from './sections'

const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

export default function Project5DetailContent({ project, locale }: Project5DetailContentProps) {
  const t = useTranslations('projects')
  const { data: content, loading } = useProjectContent<Project5Content>(
    `/content/projects/project-5-${locale}.json`,
    5
  )

  const lightbox = useLightbox()
  const [selectedEventIndex, setSelectedEventIndex] = useState(0)

  // Prepare per-event lightbox image arrays
  const eventLightboxImagesMap = useMemo(() => {
    if (!content?.events?.list) return []
    return content.events.list.map((event) =>
      event.images.map((url) => ({ url }))
    )
  }, [content?.events?.list])

  const lightboxImages = eventLightboxImagesMap[selectedEventIndex] ?? []

  const handleEventImageClick = (eventIndex: number, imageIndex: number) => {
    setSelectedEventIndex(eventIndex)
    lightbox.open(imageIndex)
  }

  // Section navigation
  const sections = useMemo(() => {
    if (!content) return []
    return [
      { id: 'p5-background', label: t('sectionNav.background') },
      ...(content.events?.list?.length ? [{ id: 'p5-events', label: t('sectionNav.events') }] : []),
      { id: 'p5-project-progress', label: t('sectionNav.projectProgress') },
    ]
  }, [content, t])

  const activeSectionId = useActiveSection(sections.map((s) => s.id))

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative h-[45vh] min-h-[320px] rounded-xl overflow-hidden bg-gradient-to-br from-stone-100 to-orange-100 animate-pulse">
          <div className="absolute inset-0 flex items-end p-4">
            <div className="space-y-2 w-full max-w-xl">
              <div className="h-7 bg-white/30 rounded w-3/4" />
              <div className="h-4 bg-white/20 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-8">
        <p className="text-gray-600 text-center">{t('contentNotAvailable')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <HeroSection content={content} project={project} locale={locale} />

      {/* Section Quick Nav */}
      <SectionNav sections={sections} activeSectionId={activeSectionId} />

      {/* Background */}
      <FadeInSection id="p5-background">
        <BackgroundSection background={content.background} />
      </FadeInSection>

      {/* Events */}
      {content.events && content.events.list.length > 0 && (
        <FadeInSection id="p5-events" delay={100}>
          <EventsSection
            events={content.events}
            locale={locale}
            onImageClick={handleEventImageClick}
          />
        </FadeInSection>
      )}

      {/* Progress */}
      <FadeInSection id="p5-project-progress" delay={200}>
        <ProjectProgressSection project={project} locale={locale} />
      </FadeInSection>

      {/* Lightbox */}
      {lightbox.isOpen && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightbox.currentIndex}
          isOpen={lightbox.isOpen}
          onClose={lightbox.close}
        />
      )}
    </div>
  )
}
