'use client'

import { useTranslations } from 'next-intl'
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'
import { HomeIcon, MapPinIcon } from '@/components/icons'
import ProjectHeroBase from '@/components/projects/shared/ProjectHeroBase'
import type { Project4Content } from '../types'
import type { ProjectStats } from '@/types'

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
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl" />
      }
      overlayEffects={
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-amber-300/40 rounded-full animate-pulse"
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
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-600/90 backdrop-blur-md rounded-full shadow-lg">
          <HomeIcon className="w-3 h-3 text-white" />
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
            {t('project4.familySupport')}
          </span>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>

      <h1 className="font-display text-2xl md:text-4xl font-bold text-white mb-1 leading-[1.1] tracking-tight drop-shadow-lg">
        {content?.title || t('project4.defaultTitle')}
      </h1>
      <p className="text-sm md:text-base text-white/90 max-w-2xl font-light">
        {content?.subtitle || ''}
      </p>

      {content?.location && (
        <div className="flex items-center gap-1.5 mt-2 text-white/70">
          <MapPinIcon className="w-3.5 h-3.5" />
          <span className="text-xs md:text-sm">{content.location}</span>
        </div>
      )}
    </ProjectHeroBase>
  )
}
