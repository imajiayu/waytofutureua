'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import MobileCarousel from '@/components/common/MobileCarousel'

export default function ApproachSection() {
  const t = useTranslations('home.hero.approach')
  const tCompliance = useTranslations('home.hero.compliance')

  const handleScrollToCompliance = () => {
    const complianceSection = document.getElementById('compliance-section')
    if (complianceSection) {
      const navHeight = 80
      const elementPosition = complianceSection.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navHeight

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  const features = [
    {
      key: 'transparent',
      icon: (
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      gradient: 'from-ukraine-blue-500 to-ukraine-blue-400',
      image: '/images/approach/transparent.webp',
    },
    {
      key: 'efficient',
      icon: (
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      gradient: 'from-ukraine-gold-500 to-ukraine-gold-400',
      image: '/images/approach/efficient.webp',
    },
    {
      key: 'direct',
      icon: (
        <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
      gradient: 'from-warm-500 to-warm-400',
      image: '/images/approach/direct.webp',
    },
  ] as const

  // 单张卡片组件（移动端和桌面端复用）
  const Card = ({
    feature,
    isMobile = false,
  }: {
    feature: (typeof features)[number]
    isMobile?: boolean
  }) => {
    const { key, icon, gradient, image } = feature
    return (
      <div
        className={`group relative transform overflow-hidden rounded-3xl shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105 hover:shadow-2xl ${
          isMobile ? 'h-[320px]' : 'h-[320px] md:h-[400px]'
        }`}
      >
        {/* Background Image */}
        <Image
          src={image}
          alt={t(`${key}.title` as any)}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes={isMobile ? '78vw' : '(max-width: 768px) 100vw, 33vw'}
        />

        {/* Gradient Overlay for better contrast */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-all duration-500 group-hover:opacity-25`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/30 transition-all duration-500 group-hover:from-black/70 group-hover:via-black/50 group-hover:to-black/40" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
          {/* Icon */}
          <div
            className={`inline-flex bg-gradient-to-br p-4 ${gradient} self-start rounded-2xl text-white shadow-xl`}
          >
            {icon}
          </div>

          {/* Content Container - Bottom */}
          <div className="mt-auto flex flex-col gap-4">
            {/* Title with backdrop - auto width */}
            <h3 className="inline-block self-start rounded-lg bg-black/20 px-3 py-2 font-display text-xl font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm sm:text-2xl">
              {t(`${key}.title` as any)}
            </h3>

            {/* List Items with subtle backdrop - auto width */}
            <ul className="space-y-2">
              {(t.raw(`${key}.items` as any) as string[]).map((item: string, index: number) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0 text-life-400 drop-shadow-lg sm:h-5 sm:w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="inline-block rounded bg-black/15 px-2 py-1 text-sm font-medium leading-relaxed text-white shadow-md backdrop-blur-sm sm:text-base">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="relative flex items-center justify-center overflow-x-hidden bg-gradient-to-br from-ukraine-gold-50 via-warm-50 to-ukraine-gold-100 py-12 md:py-16">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-20">
        <Image
          src="/images/hero/2.webp"
          alt=""
          fill
          className="object-cover mix-blend-multiply"
          quality={60}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center md:mb-10">
          <span className="mb-3 inline-block rounded-full bg-ukraine-blue-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-ukraine-blue-600">
            {t('label')}
          </span>
          <h2 className="mb-4 break-words font-display text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
            {t('title')}
          </h2>
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <p className="break-words text-center text-lg text-gray-600 sm:text-left sm:text-xl">
              {t('subtitle')}
            </p>
            <button
              onClick={handleScrollToCompliance}
              className="inline-flex flex-shrink-0 items-center rounded-lg border-2 border-ukraine-blue-500 bg-white px-4 py-2 font-semibold text-ukraine-blue-500 shadow-sm transition-all duration-200 hover:bg-ukraine-blue-50 hover:shadow-md"
            >
              <svg
                className="mr-1.5 h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="whitespace-nowrap text-sm">{tCompliance('button')}</span>
            </button>
          </div>
        </div>

        {/* Mobile: Horizontal Carousel */}
        <div className="-mx-4">
          <MobileCarousel indicatorTheme="light">
            {features.map((feature) => (
              <Card key={feature.key} feature={feature} isMobile />
            ))}
          </MobileCarousel>
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden grid-cols-3 gap-6 md:grid">
          {features.map((feature) => (
            <Card key={feature.key} feature={feature} />
          ))}
        </div>
      </div>

      {/* Scroll Indicator - Hidden on mobile */}
      <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 animate-bounce md:block">
        <svg
          className="h-5 w-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  )
}
