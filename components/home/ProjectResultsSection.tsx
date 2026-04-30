'use client'

import { useTranslations } from 'next-intl'

import ProjectResultsMosaic from './ProjectResultsMosaic'

export default function ProjectResultsSection() {
  const t = useTranslations('home.hero')

  return (
    <section className="relative pt-12 md:pt-16">
      <div className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 md:mb-10">
        <div className="text-center">
          <span className="mb-3 inline-block rounded-full bg-ukraine-gold-500 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-ukraine-blue-900">
            {t('results.label')}
          </span>
          <h2 className="mb-3 font-display text-4xl font-bold text-gray-900 sm:text-5xl md:mb-4 lg:text-6xl">
            {t('results.title')}
          </h2>
          <p className="mx-auto max-w-3xl text-lg font-light text-gray-600 sm:text-xl">
            {t('results.description')}
          </p>
        </div>
      </div>
      <ProjectResultsMosaic />
    </section>
  )
}
