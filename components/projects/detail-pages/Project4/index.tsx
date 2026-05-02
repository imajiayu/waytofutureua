'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import type { LightboxImage } from '@/components/common/ImageLightbox'
import ImageLightbox from '@/components/common/LazyImageLightbox'
import { CheckCircle2Icon } from '@/components/icons'
import { FadeInSection, SectionNav } from '@/components/projects/shared'
import ProjectProgressSection from '@/components/projects/shared/ProjectProgressSection'
import type { ResultImage } from '@/components/projects/shared/UnifiedResultsSection'
import UnifiedResultsSection from '@/components/projects/shared/UnifiedResultsSection'
import { useActiveSection } from '@/lib/hooks/useActiveSection'
import { useLightbox, useLightboxFromUrls } from '@/lib/hooks/useLightbox'
import { useProjectContents } from '@/lib/hooks/useProjectContent'

// Sections
import {
  AidListSection,
  FamilyGallerySection,
  FamilySection,
  HeroSection,
  LivingConditionsSection,
  StorySection,
  WhyGiftsSection,
} from './sections'
import type { AidListData, Project4Content, Project4DetailContentProps } from './types'

export default function Project4DetailContent({ project, locale }: Project4DetailContentProps) {
  const t = useTranslations('projects')
  const {
    data: [content, aidData],
    loading,
  } = useProjectContents<[Project4Content, AidListData]>([
    { url: `/content/projects/project-4-${locale}.json`, projectId: 4 },
    { url: `/content/projects/project-4-aid-${locale}.json`, projectId: 4 },
  ])

  const { lightbox: detailLightbox, images: detailLightboxImages } = useLightboxFromUrls(
    content?.images
  )
  const galleryLightbox = useLightbox()
  const livingConditionsImageUrls = useMemo(() => {
    const defaultImages = [
      '/images/projects/project-4/details/wood-stove.webp',
      '/images/projects/project-4/details/desk.webp',
    ]
    return content?.livingConditions?.images || defaultImages
  }, [content?.livingConditions?.images])
  const { lightbox: livingConditionsLightbox, images: livingConditionsLightboxImages } =
    useLightboxFromUrls(livingConditionsImageUrls)
  const talentLightbox = useLightbox()
  const receiptLightbox = useLightbox()

  const galleryLightboxImages = useMemo<LightboxImage[]>(
    () => content?.familyGallery?.images?.map((img) => ({ url: img.url })) || [],
    [content]
  )

  const talentLightboxImages = useMemo<LightboxImage[]>(() => {
    const images: LightboxImage[] = []
    content?.childrenTalents?.talents?.forEach((t) => images.push({ url: t.image }))
    if (content?.childrenTalents?.artworkImage) {
      images.push({ url: content.childrenTalents.artworkImage })
    }
    return images
  }, [content])

  const receiptLightboxImages = useMemo<LightboxImage[]>(
    () => [
      ...(aidData?.receipts?.images?.map((url) => ({ url })) || []),
      ...(aidData?.receiptsV2?.images?.map((url) => ({ url })) || []),
    ],
    [aidData]
  )

  // Section navigation
  const sections = useMemo(() => {
    if (!content) return []
    return [
      { id: 'p4-introduction', label: t('sectionNav.introduction') },
      ...(aidData ? [{ id: 'p4-aid-list', label: t('sectionNav.aidList') }] : []),
      { id: 'p4-project-progress', label: t('sectionNav.projectProgress') },
      ...(content.donationResults && content.donationResults.items.length > 0
        ? [{ id: 'p4-donation-results', label: t('sectionNav.donationResults') }]
        : []),
    ]
  }, [content, aidData, t])

  const activeSectionId = useActiveSection(sections.map((s) => s.id))

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative h-[45vh] min-h-[320px] animate-pulse overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 to-orange-100">
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
        id="p4-introduction"
        className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:rounded-3xl"
      >
        <div className="space-y-6 p-4 md:space-y-8 md:p-6">
          {/* Introduction with Highlights */}
          {content.introduction && (
            <FadeInSection>
              <section>
                {/* Highlights - Key Numbers */}
                {content.highlights && content.highlights.length > 0 && (
                  <div className="mb-5 grid grid-cols-3 gap-2 md:gap-3">
                    {content.highlights.map((h, idx) => (
                      <div
                        key={idx}
                        className="group relative flex flex-col items-center overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100/60 p-2.5 text-center shadow-sm md:p-4"
                      >
                        {/* Decorative background number */}
                        <span className="pointer-events-none absolute -right-1 -top-2 select-none text-[3rem] font-black leading-none text-amber-200/40 md:text-[4.5rem]">
                          {h.number}
                        </span>
                        {/* Main number */}
                        <span className="relative mb-1 text-2xl font-black leading-none text-amber-600 md:mb-1.5 md:text-4xl">
                          {h.number}
                        </span>
                        {/* Label */}
                        <span className="relative text-xs font-semibold leading-tight text-gray-800 md:text-sm">
                          {h.label}
                        </span>
                        {/* Detail */}
                        <span className="relative mt-0.5 text-balance text-[10px] leading-snug text-gray-500 md:text-xs">
                          {h.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Introduction Text */}
                <div className="max-w-3xl space-y-3">
                  {content.introduction.map((p, idx) => (
                    <p key={idx} className="text-sm leading-relaxed text-gray-700 md:text-base">
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
                      className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl md:rounded-2xl"
                      onClick={() => detailLightbox.open(idx)}
                    >
                      <Image
                        src={img}
                        alt={t('photoAlt', { index: idx + 1 })}
                        fill
                        sizes="(max-width: 768px) 33vw, 33vw"
                        className="object-cover transition-all duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
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
            <LivingConditionsSection
              content={content}
              onImageClick={livingConditionsLightbox.open}
            />
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
        <FadeInSection id="p4-aid-list" delay={450}>
          <AidListSection
            aidData={aidData}
            locale={locale}
            onReceiptClick={receiptLightbox.open}
            onReceiptV2Click={(idx) =>
              receiptLightbox.open((aidData.receipts?.images?.length || 0) + idx)
            }
          />
        </FadeInSection>
      )}

      {/* Progress */}
      <FadeInSection id="p4-project-progress">
        <ProjectProgressSection project={project} locale={locale} />
      </FadeInSection>

      {/* Donation Results */}
      {content.donationResults && content.donationResults.items.length > 0 && (
        <FadeInSection id="p4-donation-results">
          <UnifiedResultsSection
            title={content.donationResults.title}
            icon={<CheckCircle2Icon className="h-5 w-5 text-white/90" />}
            gradient="from-amber-500 to-orange-500"
            images={content.donationResults.items.map(
              (item): ResultImage => ({
                imageUrl: item.image,
                orientation: item.orientation,
                aspectRatio: item.aspectRatio,
                priority: item.priority,
              })
            )}
            getAltText={(i) => t('project4.donationResultAlt', { index: i + 1 })}
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
