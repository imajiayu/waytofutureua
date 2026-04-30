'use client'

import { useTranslations } from 'next-intl'

import { GiftIcon } from '@/components/icons'
import ProjectStatusBadge from '@/components/projects/ProjectStatusBadge'
import ProjectHeroBase from '@/components/projects/shared/ProjectHeroBase'
import TwinklingStars from '@/components/projects/shared/TwinklingStars'
import type { ProjectStats } from '@/types'

import { Snowfall } from '../components'
import type { Project3Content } from '../types'

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
        <div className="absolute right-1/4 top-1/4 h-48 w-48 rounded-full bg-christmas-gold/20 blur-3xl" />
      }
      overlayEffects={
        <>
          <Snowfall />
          <TwinklingStars count={8} />
        </>
      }
    >
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full bg-christmas-gold/90 px-2 py-1 shadow-lg backdrop-blur-md">
          <GiftIcon className="h-3 w-3 text-white" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white md:text-xs">
            {t('project3.christmasYear')}
          </span>
        </div>
        <ProjectStatusBadge status={project.status} />
      </div>
      <h1 className="mb-1 font-display text-2xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg md:text-4xl">
        {content?.title || t('project3.defaultTitle')}
      </h1>
      <p className="max-w-2xl text-sm font-light text-white/90 md:text-base">
        {content?.subtitle || ''}
      </p>
    </ProjectHeroBase>
  )
}
