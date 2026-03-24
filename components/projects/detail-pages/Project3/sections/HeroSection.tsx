'use client'

import { useTranslations } from 'next-intl'
import { GiftIcon } from '@/components/icons'
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'
import ProjectHeroBase from '@/components/projects/shared/ProjectHeroBase'
import { Snowfall } from '../components'
import TwinklingStars from '@/components/projects/shared/TwinklingStars'
import type { Project3Content } from '../types'
import type { ProjectStats } from '@/types'

interface HeroSectionProps {
  content: Project3Content | null
  project: ProjectStats
  locale: string
}

export default function HeroSection({ content, project, locale }: HeroSectionProps) {
  const t = useTranslations('projects')

  return (
    <ProjectHeroBase
      imageSrc="/images/projects/project-3/card/bg.webp"
      imageAlt={t('project3.heroImageAlt')}
      gradientOverlays={[
        'bg-gradient-to-t from-christmas-berry/95 via-christmas-berry/40 to-transparent',
        'bg-gradient-to-r from-christmas-pine/60 via-transparent to-christmas-berry/30',
        'bg-gradient-to-b from-black/20 to-transparent',
      ]}
      glowEffects={
        <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-christmas-gold/20 rounded-full blur-3xl" />
      }
      overlayEffects={
        <>
          <Snowfall />
          <TwinklingStars count={8} />
        </>
      }
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className="flex items-center gap-1 px-2 py-1 bg-christmas-gold/90 backdrop-blur-md rounded-full shadow-lg">
          <GiftIcon className="w-3 h-3 text-white" />
          <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">
            {t('project3.christmasYear')}
          </span>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>
      <h1 className="font-display text-2xl md:text-4xl font-bold text-white mb-1 leading-[1.1] tracking-tight drop-shadow-lg">
        {content?.title || t('project3.defaultTitle')}
      </h1>
      <p className="text-sm md:text-base text-white/90 max-w-2xl font-light">
        {content?.subtitle || ''}
      </p>
    </ProjectHeroBase>
  )
}
