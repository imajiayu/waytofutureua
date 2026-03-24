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
          <div className="absolute bottom-0 left-1/3 w-96 h-48 bg-orange-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl" />
        </>
      }
      overlayEffects={
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-8 h-8 rounded-full opacity-0 animate-steam-rise"
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
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-700/90 backdrop-blur-md rounded-full shadow-lg">
          <HeartIcon className="w-3 h-3 text-white" />
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
            {t('project5.badge')}
          </span>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <h1 className="font-display text-2xl md:text-4xl font-bold text-white mb-1 leading-[1.1] tracking-tight drop-shadow-lg">
        {content.title}
      </h1>
      <p className="text-sm md:text-base text-white/90 max-w-2xl font-light">
        {content.subtitle}
      </p>

      <div className="flex items-center gap-1.5 mt-2 text-white/70">
        <MapPinIcon className="w-3.5 h-3.5" />
        <span className="text-xs md:text-sm">{content.location}</span>
      </div>
    </ProjectHeroBase>
  )
}
