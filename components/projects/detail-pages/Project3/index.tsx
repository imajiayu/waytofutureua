'use client'

import { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { FadeInSection } from '@/components/projects/shared'
import ProjectProgressSection from '@/components/projects/shared/ProjectProgressSection'
import { useTranslations } from 'next-intl'
import { useProjectContents } from '@/lib/hooks/useProjectContent'
import { useLightbox } from '@/lib/hooks/useLightbox'
import type { LightboxImage } from '@/components/common/ImageLightbox'
import type { Project3Content, SuppliesData, Project3DetailContentProps } from './types'

// Sections
import {
  HeroSection,
  StatisticsSection,
  SheltersSection,
  GiftsListSection,
  SuppliesSection,
  ResultsSection,
} from './sections'

const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

export default function Project3DetailContent({ project, locale }: Project3DetailContentProps) {
  const t = useTranslations('projects')
  const { data: [content, suppliesData], loading } = useProjectContents<[Project3Content, SuppliesData]>([
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
      suppliesData?.receipts?.images?.map((url, idx) => ({ url, caption: t('receiptImageAlt', { index: idx + 1 }) })) ||
      [],
    [suppliesData]
  )

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative h-[40vh] min-h-[280px] rounded-xl overflow-hidden bg-gradient-to-br from-christmas-berry/20 to-christmas-pine/20 animate-pulse">
          <div className="absolute inset-0 flex items-end p-4">
            <div className="space-y-2 w-full max-w-xl">
              <div className="h-7 bg-white/30 rounded w-3/4" />
              <div className="h-4 bg-white/20 rounded w-1/2" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
            ))}
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
      {/* Hero */}
      <HeroSection content={content} project={project} locale={locale} />

      {/* Main Content */}
      <article className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 space-y-5 md:space-y-6">
          {/* Introduction */}
          {content?.introduction && (
            <FadeInSection>
              <section className="max-w-3xl">
                <div className="text-christmas-gold/30 text-5xl md:text-6xl font-serif leading-none mb-1 select-none">
                  "
                </div>
                {content.introduction.map((p, idx) => (
                  <p key={idx} className="text-sm md:text-base text-gray-700 leading-relaxed">
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
                    className="col-span-8 row-span-2 relative aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group"
                    onClick={() => detailLightbox.open(0)}
                  >
                    <Image
                      src={content.images[0]}
                      alt={t('eventImageAlt', { index: 1 })}
                      fill
                      sizes="(max-width: 768px) 66vw, 50vw"
                      className="object-cover transition-all duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {content.images.slice(1, 3).map((img, idx) => (
                    <div
                      key={idx}
                      className="col-span-4 relative aspect-square rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group"
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
                      className="col-span-4 relative aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group"
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
        <FadeInSection>
          <SuppliesSection
            suppliesData={suppliesData}
            locale={locale}
            onReceiptClick={receiptLightbox.open}
          />
        </FadeInSection>
      )}

      {/* Progress */}
      <FadeInSection>
        <ProjectProgressSection project={project} locale={locale} />
      </FadeInSection>

      {/* Results */}
      {content?.results && content.results.length > 0 && (
        <FadeInSection>
          <ResultsSection results={content.results} />
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
