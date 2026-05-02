'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'

import type { LightboxImage } from '@/components/common/ImageLightbox'
import ImageLightbox from '@/components/common/LazyImageLightbox'
import { SparklesIcon } from '@/components/icons'
import type { ResultImage } from '@/components/projects/shared'
import { FadeInSection, SectionNav, UnifiedResultsSection } from '@/components/projects/shared'
import ProjectProgressSection from '@/components/projects/shared/ProjectProgressSection'
import { useActiveSection } from '@/lib/hooks/useActiveSection'
import { useLightbox } from '@/lib/hooks/useLightbox'
import { useProjectContents } from '@/lib/hooks/useProjectContent'

import { Snowfall } from './components'
// Sections
import {
  GiftsListSection,
  HeroSection,
  SheltersSection,
  StatisticsSection,
  SuppliesSection,
} from './sections'
import type { Project3Content, Project3DetailContentProps, SuppliesData } from './types'

export default function Project3DetailContent({ project, locale }: Project3DetailContentProps) {
  const t = useTranslations('projects')
  const {
    data: [content, suppliesData],
    loading,
  } = useProjectContents<[Project3Content, SuppliesData]>([
    { url: `/content/projects/project-3-${locale}.json`, projectId: 3 },
    { url: `/content/projects/project-3-supplies-${locale}.json`, projectId: 3 },
  ])

  const [expandedShelters, setExpandedShelters] = useState<Set<number>>(new Set())
  const detailLightbox = useLightbox()
  const receiptLightbox = useLightbox()

  const toggleShelter = useCallback((index: number) => {
    setExpandedShelters((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const detailLightboxImages = useMemo<LightboxImage[]>(
    () =>
      content?.images?.map((url, idx) => ({ url, caption: `${content.title} - ${idx + 1}` })) || [],
    [content]
  )
  const receiptLightboxImages = useMemo<LightboxImage[]>(
    () =>
      suppliesData?.receipts?.images?.map((url, idx) => ({
        url,
        caption: t('receiptImageAlt', { index: idx + 1 }),
      })) || [],
    [suppliesData, t]
  )

  // Section navigation
  const sections = useMemo(() => {
    if (!content) return []
    return [
      { id: 'p3-introduction', label: t('sectionNav.introduction') },
      ...(suppliesData ? [{ id: 'p3-supplies', label: t('sectionNav.supplies') }] : []),
      { id: 'p3-project-progress', label: t('sectionNav.projectProgress') },
      ...(content.results?.length ? [{ id: 'p3-results', label: t('sectionNav.results') }] : []),
    ]
  }, [content, suppliesData, t])

  const activeSectionId = useActiveSection(sections.map((s) => s.id))

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative h-[40vh] min-h-[280px] animate-pulse overflow-hidden rounded-xl bg-gradient-to-br from-christmas-berry/20 to-christmas-pine/20">
          <div className="absolute inset-0 flex items-end p-4">
            <div className="w-full max-w-xl space-y-2">
              <div className="h-7 w-3/4 rounded bg-white/30" />
              <div className="h-4 w-1/2 rounded bg-white/20" />
            </div>
          </div>
        </div>
        <div className="space-y-3 rounded-xl bg-white p-4">
          <div className="h-4 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="overflow-hidden rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-center text-gray-600">{t('contentNotAvailable')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Hero */}
      <HeroSection content={content} project={project} locale={locale} />

      {/* Section Quick Nav */}
      <SectionNav sections={sections} activeSectionId={activeSectionId} />

      {/* Main Content */}
      <article
        id="p3-introduction"
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:rounded-3xl"
      >
        <div className="space-y-5 p-4 md:space-y-6 md:p-6">
          {/* Introduction */}
          {content?.introduction && (
            <FadeInSection>
              <section className="max-w-3xl">
                <div className="mb-1 select-none font-serif text-5xl leading-none text-christmas-gold/30 md:text-6xl">
                  &ldquo;
                </div>
                {content.introduction.map((p, idx) => (
                  <p key={idx} className="text-sm leading-relaxed text-gray-700 md:text-base">
                    {p}
                  </p>
                ))}
              </section>
            </FadeInSection>
          )}

          {/* Images */}
          {content?.images && content.images.length > 0 && (
            <FadeInSection delay={100}>
              <section>
                <div className="grid grid-cols-12 gap-2 md:gap-3">
                  <div
                    className="group relative col-span-8 row-span-2 aspect-[4/3] cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
                    onClick={() => detailLightbox.open(0)}
                  >
                    <Image
                      src={content.images[0]}
                      alt={t('eventImageAlt', { index: 1 })}
                      fill
                      sizes="(max-width: 768px) 66vw, 50vw"
                      className="object-cover transition-all duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  {content.images.slice(1, 3).map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative col-span-4 aspect-square cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
                      onClick={() => detailLightbox.open(idx + 1)}
                    >
                      <Image
                        src={img}
                        alt={t('eventImageAlt', { index: idx + 2 })}
                        fill
                        sizes="(max-width: 768px) 33vw, 25vw"
                        className="object-cover transition-all duration-500 group-hover:scale-105"
                      />
                    </div>
                  ))}
                  {content.images.slice(3, 6).map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative col-span-4 aspect-[4/3] cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
                      onClick={() => detailLightbox.open(idx + 3)}
                    >
                      <Image
                        src={img}
                        alt={t('eventImageAlt', { index: idx + 4 })}
                        fill
                        sizes="(max-width: 768px) 33vw, 25vw"
                        className="object-cover transition-all duration-500 group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </section>
            </FadeInSection>
          )}

          {/* Statistics */}
          {content?.statistics && (
            <FadeInSection delay={150}>
              <StatisticsSection content={content} />
            </FadeInSection>
          )}

          {/* Shelters */}
          {content?.shelters && (
            <FadeInSection delay={200}>
              <SheltersSection content={content} locale={locale} />
            </FadeInSection>
          )}

          {/* Gifts List */}
          {content?.giftsList && (
            <FadeInSection delay={250}>
              <GiftsListSection
                content={content}
                expandedShelters={expandedShelters}
                onToggleShelter={toggleShelter}
              />
            </FadeInSection>
          )}
        </div>
      </article>

      {/* Supplies */}
      {suppliesData && (
        <FadeInSection id="p3-supplies">
          <SuppliesSection
            suppliesData={suppliesData}
            locale={locale}
            onReceiptClick={receiptLightbox.open}
          />
        </FadeInSection>
      )}

      {/* Progress */}
      <FadeInSection id="p3-project-progress">
        <ProjectProgressSection project={project} locale={locale} />
      </FadeInSection>

      {/* Results */}
      {content?.results && content.results.length > 0 && (
        <FadeInSection id="p3-results">
          <UnifiedResultsSection
            title={t('project3.momentsOfJoy')}
            icon={
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
            }
            gradient="from-christmas-berry via-rose-600 to-christmas-gold"
            images={content.results.map(
              (r): ResultImage => ({
                imageUrl: r.imageUrl,
                caption: r.caption,
                priority: r.priority,
              })
            )}
            getAltText={(i) => t('project3.resultAlt', { index: i + 1 })}
            headerDecoration={<Snowfall />}
          />
        </FadeInSection>
      )}

      {/* Lightboxes */}
      {detailLightbox.isOpen && (
        <ImageLightbox
          images={detailLightboxImages}
          initialIndex={detailLightbox.currentIndex}
          isOpen={detailLightbox.isOpen}
          onClose={detailLightbox.close}
        />
      )}
      {receiptLightbox.isOpen && (
        <ImageLightbox
          images={receiptLightboxImages}
          initialIndex={receiptLightbox.currentIndex}
          isOpen={receiptLightbox.isOpen}
          onClose={receiptLightbox.close}
        />
      )}
    </div>
  )
}
