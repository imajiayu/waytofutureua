'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { HeartIcon, MapPinIcon } from '@/components/icons'
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'
import type { SectionProps } from '../types'

export default function HeroSection({ content, project, locale }: SectionProps) {
  const t = useTranslations('projects')

  return (
    <section className="relative h-[45vh] min-h-[320px] md:h-[50vh] md:min-h-[380px] rounded-xl md:rounded-2xl overflow-hidden group">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/projects/project-5/card/bg.webp"
          alt={t('project5.heroImageAlt')}
          fill
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          priority
        />
        {/* Warm-to-cold gradient — hot meals against cold winter */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/95 via-stone-800/50 to-slate-700/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/40 via-transparent to-slate-800/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 to-transparent" />
        {/* Warm glow from below — evoking the warmth of food */}
        <div className="absolute bottom-0 left-1/3 w-96 h-48 bg-orange-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />
      </div>

      {/* Rising steam effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-8 h-8 rounded-full opacity-0"
            style={{
              left: `${20 + i * 14}%`,
              bottom: '10%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
              animation: `steamRise ${4 + i * 0.8}s ease-out infinite`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        ))}
        <style jsx>{`
          @keyframes steamRise {
            0% {
              opacity: 0;
              transform: translateY(0) scale(1);
            }
            20% {
              opacity: 0.6;
            }
            100% {
              opacity: 0;
              transform: translateY(-120px) scale(2.5);
            }
          }
        `}</style>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
        {/* Badges */}
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-700/90 backdrop-blur-md rounded-full shadow-lg">
            <HeartIcon className="w-3 h-3 text-white" />
            <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
              {t('project5.badge')}
            </span>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>

        {/* Title */}
        <h1 className="font-display text-2xl md:text-4xl font-bold text-white mb-1 leading-[1.1] tracking-tight drop-shadow-lg">
          {content.title}
        </h1>

        {/* Subtitle */}
        <p className="text-sm md:text-base text-white/90 max-w-2xl font-light">
          {content.subtitle}
        </p>

        {/* Location */}
        <div className="flex items-center gap-1.5 mt-2 text-white/70">
          <MapPinIcon className="w-3.5 h-3.5" />
          <span className="text-xs md:text-sm">{content.location}</span>
        </div>
      </div>
    </section>
  )
}
