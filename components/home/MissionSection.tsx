import Image from 'next/image'
import { getTranslations } from 'next-intl/server'

import MobileCarousel from '@/components/common/MobileCarousel'

export default async function MissionSection() {
  const t = await getTranslations('home.hero.mission')

  const cards = [
    { key: 'displaced', image: '/images/mission/displaced.webp' },
    { key: 'women', image: '/images/mission/women.webp' },
    { key: 'civilians', image: '/images/mission/civilians.webp' },
  ] as const

  // 单张卡片组件（移动端和桌面端复用）
  const Card = ({
    cardKey,
    image,
    isMobile = false,
  }: {
    cardKey: (typeof cards)[number]['key']
    image: string
    isMobile?: boolean
  }) => (
    <div
      className={`group relative transform overflow-hidden rounded-3xl shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105 hover:shadow-2xl ${
        isMobile ? 'h-[280px]' : 'h-[280px] md:h-[400px]'
      }`}
    >
      {/* Background Image */}
      <Image
        src={image}
        alt={t(cardKey)}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes={isMobile ? '78vw' : '(max-width: 768px) 100vw, 33vw'}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/40 transition-all duration-500 group-hover:from-black/80 group-hover:via-black/60 group-hover:to-black/50" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 sm:p-8">
        {/* Title */}
        <h3 className="self-start rounded-lg bg-black/20 px-3 py-2 font-display text-xl font-bold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm sm:text-2xl">
          {t(cardKey)}
        </h3>
      </div>
    </div>
  )

  return (
    <section className="relative flex items-center justify-center overflow-hidden py-12 md:py-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero/1.webp"
          alt=""
          fill
          className="object-cover"
          priority
          quality={75}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 text-center text-white sm:px-6 lg:px-8">
        {/* Label */}
        <div className="mb-3">
          <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
            {t('label')}
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-3 font-display text-4xl font-bold leading-tight sm:text-5xl md:mb-4 md:text-6xl lg:text-7xl">
          {t('title')}
        </h1>

        {/* Subtitle - two lines with centered highlight */}
        <div className="mx-auto mb-8 max-w-4xl md:mb-10">
          <p className="text-base font-light leading-relaxed text-gray-200 sm:text-lg md:text-xl lg:text-2xl">
            {t('subtitleLine1')}
          </p>
          <p className="mt-2 text-base font-light leading-relaxed text-gray-200 sm:text-lg md:text-xl lg:text-2xl">
            {t('subtitleBefore')}
            <span className="relative inline-block font-semibold text-white">
              {t('subtitleHighlight')}
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-ukraine-gold-400 via-ukraine-gold-300 to-ukraine-gold-400" />
            </span>
            {t('subtitleAfter')}
          </p>
        </div>

        {/* Mobile: Horizontal Carousel */}
        <div className="-mx-4">
          <MobileCarousel>
            {cards.map(({ key, image }) => (
              <Card key={key} cardKey={key} image={image} isMobile />
            ))}
          </MobileCarousel>
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden grid-cols-3 gap-6 md:grid">
          {cards.map(({ key, image }) => (
            <Card key={key} cardKey={key} image={image} />
          ))}
        </div>
      </div>

      {/* Scroll Indicator - Hidden on mobile */}
      <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 animate-bounce md:block">
        <svg
          className="h-5 w-5 text-white/70"
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
