'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import CollapsibleGallery from './CollapsibleGallery'
import type { LightboxImage } from '@/components/common/ImageLightbox'
import { FadeInSection, SectionHeader, SectionNav, UnifiedResultsSection } from '@/components/projects/shared'
import type { ResultImage } from '@/components/projects/shared'
import { CheckCircle2Icon } from '@/components/icons'
import { useActiveSection } from '@/lib/hooks/useActiveSection'
import ProjectProgressSection from '@/components/projects/shared/ProjectProgressSection'
import { useProjectContent } from '@/lib/hooks/useProjectContent'
import { useLightbox } from '@/lib/hooks/useLightbox'
import type { Project0Content, Project0DetailContentProps } from './types'

// Sections
import {
  HeroSection,
  IntroductionSection,
  EventGallerySection,
  StatisticsSection,
  TeamSection,
  TreatmentSection,
  SuccessStoriesSection,
  ChallengesSection,
  FinancialSection,
  CallToActionSection,
} from './sections'

// Dynamic import for Lightbox
const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

export default function Project0DetailContent({ project, locale }: Project0DetailContentProps) {
  const t = useTranslations('projects')
  const { data: content, loading } = useProjectContent<Project0Content>(
    `/content/projects/project-0-${locale}.json`,
    0
  )
  const [employerImages] = useState(() =>
    Array.from({ length: 13 }, (_, i) => `/images/projects/project-0/employer/employer${i}.webp`)
  )

  // Lightbox states
  const eventLightbox = useLightbox()
  const successLightbox = useLightbox()
  const reportLightbox = useLightbox()
  const employerLightbox = useLightbox()

  // Prepare lightbox images
  const eventLightboxImages = useMemo<LightboxImage[]>(
    () => (content?.images || []).map((url) => ({ url })),
    [content?.images]
  )

  const successLightboxImages = useMemo<LightboxImage[]>(
    () => (content?.successStories || []).map((story) => ({ url: story.image })),
    [content?.successStories]
  )

  const reportLightboxImages = useMemo<LightboxImage[]>(
    () =>
      (content?.financialStatus?.yearlyData || [])
        .filter((year) => year.reportImage)
        .map((year) => ({ url: year.reportImage! })),
    [content?.financialStatus?.yearlyData]
  )

  const employerLightboxImages = useMemo<LightboxImage[]>(
    () => employerImages.map((url) => ({ url })),
    [employerImages]
  )

  // Section navigation
  const sections = useMemo(() => {
    if (!content) return []
    return [
      { id: 'p0-introduction', label: t('sectionNav.introduction') },
      { id: 'p0-project-progress', label: t('sectionNav.projectProgress') },
      ...(content.donationResults?.items?.length ? [{ id: 'p0-donation-results', label: t('sectionNav.donationResults') }] : []),
    ]
  }, [content, t])

  const activeSectionId = useActiveSection(sections.map((s) => s.id))

  if (loading) {
    return (
      <article className="space-y-4">
        {/* Hero Skeleton */}
        <div className="relative h-[60vh] min-h-[400px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse">
          <div className="absolute inset-0 flex items-end p-8">
            <div className="space-y-4 w-full max-w-2xl">
              <div className="h-10 bg-white/30 rounded-lg w-3/4"></div>
              <div className="h-6 bg-white/20 rounded w-1/2"></div>
            </div>
          </div>
        </div>
        {/* Content Skeleton */}
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </article>
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
      {/* Hero Section */}
      <HeroSection content={content} locale={locale} />

      {/* Section Quick Nav */}
      <SectionNav sections={sections} activeSectionId={activeSectionId} />

      {/* Main Content Card */}
      <article id="p0-introduction" className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
          {/* Introduction */}
          <FadeInSection>
            <IntroductionSection content={content} />
          </FadeInSection>

          {/* Event Gallery */}
          {content.images && content.images.length > 0 && (
            <FadeInSection delay={100}>
              <EventGallerySection content={content} onImageClick={eventLightbox.open} />
            </FadeInSection>
          )}

          {/* Statistics */}
          <FadeInSection delay={200}>
            <StatisticsSection content={content} />
          </FadeInSection>

          {/* Progress Gallery */}
          {content.progressGallery && content.results && (
            <FadeInSection delay={300}>
              <section>
                <SectionHeader title={content.progressGallery.title} gradientClassName="from-ukraine-blue-500 to-ukraine-gold-500" />
                <CollapsibleGallery
                  results={[
                    ...content.progressGallery.images.map((img) => ({
                      imageUrl: img.url,
                      caption: img.caption,
                      priority: img.priority,
                    })),
                    ...content.results,
                  ].filter((img) => {
                    const excludedImages = [
                      '/images/projects/project-0/result/result1.webp',
                      '/images/projects/project-0/progress/progress14.webp',
                      '/images/projects/project-0/result/result13-2.webp',
                      '/images/projects/project-0/progress/progress13.webp',
                    ]
                    return !excludedImages.includes(img.imageUrl)
                  })}
                />
              </section>
            </FadeInSection>
          )}

          {/* Team Section */}
          {content.team && (
            <FadeInSection delay={400}>
              <TeamSection
                content={content}
                employerImages={employerImages}
                onImageClick={employerLightbox.open}
              />
            </FadeInSection>
          )}

          {/* Treatment Programs */}
          <FadeInSection delay={500}>
            <TreatmentSection content={content} />
          </FadeInSection>

          {/* Success Stories */}
          <FadeInSection delay={600}>
            <SuccessStoriesSection content={content} onImageClick={successLightbox.open} />
          </FadeInSection>

          {/* Challenges */}
          <FadeInSection delay={700}>
            <ChallengesSection content={content} />
          </FadeInSection>

          {/* Financial Status */}
          {content.financialStatus && (
            <FadeInSection delay={800}>
              <FinancialSection content={content} onReportClick={reportLightbox.open} />
            </FadeInSection>
          )}

          {/* Call to Action */}
          {content.callToAction && (
            <FadeInSection delay={900}>
              <CallToActionSection content={content} />
            </FadeInSection>
          )}
        </div>

        {/* Lightboxes */}
        {eventLightbox.isOpen && (
          <ImageLightbox
            images={eventLightboxImages}
            initialIndex={eventLightbox.currentIndex}
            isOpen={eventLightbox.isOpen}
            onClose={eventLightbox.close}
          />
        )}
        {successLightbox.isOpen && (
          <ImageLightbox
            images={successLightboxImages}
            initialIndex={successLightbox.currentIndex}
            isOpen={successLightbox.isOpen}
            onClose={successLightbox.close}
          />
        )}
        {reportLightbox.isOpen && (
          <ImageLightbox
            images={reportLightboxImages}
            initialIndex={reportLightbox.currentIndex}
            isOpen={reportLightbox.isOpen}
            onClose={reportLightbox.close}
          />
        )}
        {employerLightbox.isOpen && (
          <ImageLightbox
            images={employerLightboxImages}
            initialIndex={employerLightbox.currentIndex}
            isOpen={employerLightbox.isOpen}
            onClose={employerLightbox.close}
          />
        )}
      </article>

      {/* Project Progress Section */}
      <FadeInSection id="p0-project-progress">
        <ProjectProgressSection project={project} locale={locale} />
      </FadeInSection>

      {/* Donation Results — standalone module */}
      {content.donationResults && content.donationResults.items.length > 0 && (
        <FadeInSection id="p0-donation-results">
          <UnifiedResultsSection
            title={content.donationResults.title}
            icon={<CheckCircle2Icon className="w-5 h-5 text-white/90" />}
            gradient="from-life-600 to-emerald-600"
            images={content.donationResults.items.map((item): ResultImage => ({
              imageUrl: item.image,
              orientation: item.orientation,
              aspectRatio: item.aspectRatio,
            }))}
            getAltText={(i) => t('project0.donationResultAlt', { index: i + 1 })}
          />
        </FadeInSection>
      )}
    </div>
  )
}
