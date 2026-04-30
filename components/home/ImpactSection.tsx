'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import MobileCarousel from '@/components/common/MobileCarousel'

export default function ImpactSection() {
  const t = useTranslations('home.hero.impact')

  const stats = [
    {
      key: 'donations',
      icon: (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'from-ukraine-gold-400 to-ukraine-gold-600',
      image: '/images/impact/donations.webp',
    },
    {
      key: 'people',
      icon: (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: 'from-ukraine-blue-400 to-ukraine-blue-600',
      image: '/images/impact/people.webp',
    },
    {
      key: 'shelters',
      icon: (
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      color: 'from-life-400 to-life-600',
      image: '/images/impact/shelters.webp',
    },
  ] as const

  // 单张卡片组件（移动端和桌面端复用）
  const Card = ({
    stat,
    isMobile = false,
  }: {
    stat: (typeof stats)[number]
    isMobile?: boolean
  }) => {
    const { key, icon, color, image } = stat
    return (
      <div
        className={`group relative transform overflow-hidden rounded-3xl shadow-lg transition-all duration-500 hover:-translate-y-2 hover:scale-105 hover:shadow-2xl ${
          isMobile ? 'h-[280px]' : 'h-[280px] md:h-[400px]'
        }`}
      >
        {/* Background Image */}
        <Image
          src={image}
          alt={t(`${key}.label` as any)}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes={isMobile ? '78vw' : '(max-width: 768px) 100vw, 33vw'}
        />

        {/* Gradient Overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/50 to-black/40 transition-all duration-500 group-hover:from-black/80 group-hover:via-black/60 group-hover:to-black/50" />

        {/* Card Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
          {/* Icon */}
          <div
            className={`inline-flex bg-gradient-to-br p-4 ${color} self-start rounded-2xl text-white shadow-xl`}
          >
            {icon}
          </div>

          {/* Stats Container */}
          <div className="mt-auto flex flex-col gap-3">
            {/* Value with backdrop - Large stat number */}
            <div
              className={`self-start rounded-xl bg-black/25 px-4 py-2 font-data font-bold tracking-tight text-white shadow-2xl backdrop-blur-md ${
                isMobile
                  ? 'text-[clamp(1.75rem,_3vw+0.5rem,_2.5rem)]'
                  : 'text-[clamp(2rem,_4vw+0.5rem,_3.75rem)]'
              }`}
            >
              {t(`${key}.value` as any)}
            </div>

            {/* Label with backdrop */}
            <div
              className={`self-start rounded-lg bg-black/20 px-3 py-2 font-semibold leading-snug text-white shadow-lg backdrop-blur-sm ${
                isMobile
                  ? 'text-[clamp(0.875rem,_1.5vw+0.25rem,_1rem)]'
                  : 'text-[clamp(1rem,_2vw+0.25rem,_1.25rem)]'
              }`}
            >
              {t(`${key}.label` as any)}
            </div>
          </div>

          {/* Glow Effect */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${color} rounded-3xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-20`}
          />
        </div>
      </div>
    )
  }

  return (
    <section className="relative flex items-center justify-center overflow-hidden py-12 md:py-16">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/hero/3.webp" alt="" fill className="object-cover" quality={75} />
        <div className="absolute inset-0 bg-gradient-to-br from-ukraine-blue-800/90 via-ukraine-blue-700/85 to-ukraine-blue-600/80" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-ukraine-gold-500/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 animate-pulse rounded-full bg-ukraine-blue-400/20 blur-3xl delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center md:mb-10">
          <span className="mb-3 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            {t('label')}
          </span>
          <h2 className="mb-3 font-display text-4xl font-bold text-white sm:text-5xl md:mb-4 lg:text-6xl">
            {t('title')}
          </h2>
          <p className="mx-auto max-w-3xl text-lg font-light text-white/90 sm:text-xl">
            {t('subtitle')}
          </p>
        </div>

        {/* Mobile: Horizontal Carousel */}
        <div className="-mx-4">
          <MobileCarousel indicatorTheme="dark">
            {stats.map((stat) => (
              <Card key={stat.key} stat={stat} isMobile />
            ))}
          </MobileCarousel>
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden grid-cols-3 gap-6 md:grid">
          {stats.map((stat) => (
            <Card key={stat.key} stat={stat} />
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
