'use client'

import { useTranslations } from 'next-intl'

import { HomeIcon, MapPinIcon } from '@/components/icons'
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'
import ProjectHeroBase from '@/components/projects/shared/ProjectHeroBase'
import type { ProjectStats } from '@/types'

import type { Project4Content } from '../types'

interface HeroSectionProps {
  content: Project4Content | null
  project: ProjectStats
  locale: string
}

export default function HeroSection({ content, project, locale }: HeroSectionProps) {
  const t = useTranslations('projects')

  return (
    <ProjectHeroBase
      imageSrc="/images/projects/project-4/card/bg.webp"
      imageAlt={content?.title || 'Family Support Project'}
      heightClass="h-[45vh] min-h-[320px] md:h-[50vh] md:min-h-[380px]"
      gradientOverlays={[
        'bg-gradient-to-t from-amber-900/90 via-amber-800/40 to-transparent',
        'bg-gradient-to-r from-stone-900/50 via-transparent to-amber-700/20',
        'bg-gradient-to-b from-black/30 to-transparent',
      ]}
      glowEffects={
        <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
      }
      overlayEffects={
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 animate-pulse rounded-full bg-amber-300/40"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      }
    >
      {/* Badges */}
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full bg-amber-600/90 px-2 py-1 shadow-lg backdrop-blur-md">
          <HomeIcon className="h-3 w-3 text-white" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white md:text-xs">
            {t('project4.familySupport')}
          </span>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <h1 className="mb-1 font-display text-2xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg md:text-4xl">
        {content?.title || t('project4.defaultTitle')}
      </h1>
      <p className="max-w-2xl text-sm font-light text-white/90 md:text-base">
        {content?.subtitle || ''}
      </p>

      {content?.location && (
        <div className="mt-2 flex items-center gap-1.5 text-white/70">
          <MapPinIcon className="h-3.5 w-3.5" />
          <span className="text-xs md:text-sm">{content.location}</span>
        </div>
      )}
    </ProjectHeroBase>
  )
}
