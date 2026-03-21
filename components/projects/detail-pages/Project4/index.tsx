'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { FadeInSection } from '@/components/projects/shared'
import ProjectProgressSection from '@/components/projects/shared/ProjectProgressSection'
import { useProjectContents } from '@/lib/hooks/useProjectContent'
import { useLightbox } from '@/lib/hooks/useLightbox'
import type { LightboxImage } from '@/components/common/ImageLightbox'
import type { Project4Content, Project4DetailContentProps, AidListData } from './types'

// Sections
import {
  HeroSection,
  FamilySection,
  LivingConditionsSection,
  StorySection,
  AidListSection,
  WhyGiftsSection,
  FamilyGallerySection,
} from './sections'

const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

export default function Project4DetailContent({ project, locale }: Project4DetailContentProps) {
  const { data: [content, aidData], loading } = useProjectContents<[Project4Content, AidListData]>([
    { url: `/content/projects/project-4-${locale}.json`, projectId: 4 },
    { url: `/content/projects/project-4-aid-${locale}.json`, projectId: 4 },
  ])

  const detailLightbox = useLightbox()
  const galleryLightbox = useLightbox()
  const livingConditionsLightbox = useLightbox()
  const talentLightbox = useLightbox()
  const receiptLightbox = useLightbox()

  const detailLightboxImages = useMemo<LightboxImage[]>(
    () => content?.images?.map((url) => ({ url })) || [],
    [content]
  )

  const galleryLightboxImages = useMemo<LightboxImage[]>(
    () => content?.familyGallery?.images?.map((img) => ({ url: img.url })) || [],
    [content]
  )

  const livingConditionsLightboxImages = useMemo<LightboxImage[]>(() => {
    const defaultImages = [
      '/images/projects/project-4/details/wood-stove.webp',
      '/images/projects/project-4/details/desk.webp',
    ]
    const images = content?.livingConditions?.images || defaultImages
    return images.map((url) => ({ url }))
  }, [content])

  const talentLightboxImages = useMemo<LightboxImage[]>(() => {
    const images: LightboxImage[] = []
    content?.childrenTalents?.talents?.forEach((t) => images.push({ url: t.image }))
    if (content?.childrenTalents?.artworkImage) {
      images.push({ url: content.childrenTalents.artworkImage })
    }
    return images
  }, [content])

  const receiptLightboxImages = useMemo<LightboxImage[]>(
    () => aidData?.receipts?.images?.map((url) => ({ url })) || [],
    [aidData]
  )

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative h-[45vh] min-h-[320px] rounded-xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 animate-pulse">
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
        <p className="text-gray-600 text-center">Content not available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Hero */}
      <HeroSection content={content} project={project} locale={locale} />

      {/* Main Content */}
      <article className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 space-y-6 md:space-y-8">
          {/* Introduction with Highlights */}
          {content.introduction && (
            <FadeInSection>
              <section>
                {/* Highlights - Key Numbers */}
                {content.highlights && content.highlights.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 md:gap-3 mb-5">
                    {content.highlights.map((h, idx) => (
                      <div
                        key={idx}
                        className="relative flex flex-col items-center text-center p-2.5 md:p-4 bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/60 rounded-xl border border-amber-200/60 shadow-sm overflow-hidden group"
                      >
                        {/* Decorative background number */}
                        <span className="absolute -right-1 -top-2 text-[3rem] md:text-[4.5rem] font-black text-amber-200/40 leading-none select-none pointer-events-none">
                          {h.number}
                        </span>
                        {/* Main number */}
                        <span className="relative text-2xl md:text-4xl font-black text-amber-600 leading-none mb-1 md:mb-1.5">
                          {h.number}
                        </span>
                        {/* Label */}
                        <span className="relative text-xs md:text-sm font-semibold text-gray-800 leading-tight">
                          {h.label}
                        </span>
                        {/* Detail */}
                        <span className="relative text-[10px] md:text-xs text-gray-500 leading-snug mt-0.5 text-balance">
                          {h.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Introduction Text */}
                <div className="max-w-3xl space-y-3">
                  {content.introduction.map((p, idx) => (
                    <p key={idx} className="text-sm md:text-base text-gray-700 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            </FadeInSection>
          )}

          {/* Images Grid - 3 vertical images side by side */}
          {content.images && content.images.length > 0 && (
            <FadeInSection delay={100}>
              <section>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {content.images.slice(0, 3).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[3/4] rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group"
                      onClick={() => detailLightbox.open(idx)}
                    >
                      <Image
                        src={img}
                        alt={`Photo ${idx + 1}`}
                        fill
                        sizes="(max-width: 768px) 33vw, 33vw"
                        className="object-cover transition-all duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            </FadeInSection>
          )}

          {/* Family Section */}
          <FadeInSection delay={150}>
            <FamilySection content={content} locale={locale} />
          </FadeInSection>

          {/* Living Conditions */}
          <FadeInSection delay={200}>
            <LivingConditionsSection content={content} onImageClick={livingConditionsLightbox.open} />
          </FadeInSection>

          {/* Children's Talents */}
          <FadeInSection delay={250}>
            <StorySection content={content} onTalentImageClick={talentLightbox.open} />
          </FadeInSection>

          {/* Family Gallery */}
          {content.familyGallery && content.familyGallery.images.length > 0 && (
            <FadeInSection delay={300}>
              <FamilyGallerySection content={content} onImageClick={galleryLightbox.open} />
            </FadeInSection>
          )}

          {/* Why Gifts */}
          <FadeInSection delay={350}>
            <WhyGiftsSection content={content} />
          </FadeInSection>
        </div>
      </article>

      {/* Aid List - Standalone Section */}
      {aidData && (
        <FadeInSection delay={450}>
          <AidListSection aidData={aidData} locale={locale} onReceiptClick={receiptLightbox.open} />
        </FadeInSection>
      )}

      {/* Progress */}
      <FadeInSection>
        <ProjectProgressSection project={project} locale={locale} />
      </FadeInSection>

      {/* Lightboxes */}
      {detailLightbox.isOpen && (
        <ImageLightbox
          images={detailLightboxImages}
          initialIndex={detailLightbox.currentIndex}
          isOpen={detailLightbox.isOpen}
          onClose={detailLightbox.close}
        />
      )}
      {galleryLightbox.isOpen && (
        <ImageLightbox
          images={galleryLightboxImages}
          initialIndex={galleryLightbox.currentIndex}
          isOpen={galleryLightbox.isOpen}
          onClose={galleryLightbox.close}
        />
      )}
      {livingConditionsLightbox.isOpen && (
        <ImageLightbox
          images={livingConditionsLightboxImages}
          initialIndex={livingConditionsLightbox.currentIndex}
          isOpen={livingConditionsLightbox.isOpen}
          onClose={livingConditionsLightbox.close}
        />
      )}
      {talentLightbox.isOpen && (
        <ImageLightbox
          images={talentLightboxImages}
          initialIndex={talentLightbox.currentIndex}
          isOpen={talentLightbox.isOpen}
          onClose={talentLightbox.close}
        />
      )}
      {receiptLightbox.isOpen && receiptLightboxImages.length > 0 && (
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
