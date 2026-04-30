'use client'

import { useTranslations } from 'next-intl'

import { HeartIcon, MapPinIcon } from '@/components/icons'
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'
import ProjectHeroBase from '@/components/projects/shared/ProjectHeroBase'

import type { SectionProps } from '../types'

export default function HeroSection({ content, project, locale }: SectionProps) {
  const t = useTranslations('projects')

  return (
    <ProjectHeroBase
      imageSrc="/images/projects/project-5/card/bg.webp"
      imageAlt={t('project5.heroImageAlt')}
      heightClass="h-[45vh] min-h-[320px] md:h-[50vh] md:min-h-[380px]"
      gradientOverlays={[
        'bg-gradient-to-t from-stone-900/95 via-stone-800/50 to-slate-700/20',
        'bg-gradient-to-r from-orange-900/40 via-transparent to-slate-800/30',
        'bg-gradient-to-b from-black/25 to-transparent',
      ]}
      glowEffects={
        <>
          <div className="absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-orange-500/15 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        </>
      }
      overlayEffects={
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute h-8 w-8 animate-steam-rise rounded-full opacity-0"
              style={{
                left: `${20 + i * 14}%`,
                bottom: '10%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                animationDuration: `${4 + i * 0.8}s`,
                animationDelay: `${i * 1.2}s`,
              }}
            />
          ))}
        </div>
      }
    >
      {/* Badges */}
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full bg-orange-700/90 px-2 py-1 shadow-lg backdrop-blur-md">
          <HeartIcon className="h-3 w-3 text-white" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white md:text-xs">
            {t('project5.badge')}
          </span>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <h1 className="mb-1 font-display text-2xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg md:text-4xl">
        {content.title}
      </h1>
      <p className="max-w-2xl text-sm font-light text-white/90 md:text-base">{content.subtitle}</p>

      <div className="mt-2 flex items-center gap-1.5 text-white/70">
        <MapPinIcon className="h-3.5 w-3.5" />
        <span className="text-xs md:text-sm">{content.location}</span>
      </div>
    </ProjectHeroBase>
  )
}
