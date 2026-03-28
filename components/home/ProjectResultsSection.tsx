'use client'

import { useTranslations } from 'next-intl'
import ProjectResultsMosaic from './ProjectResultsMosaic'

export default function ProjectResultsSection() {
  const t = useTranslations('home.hero')

  return (
    <section className="relative pt-12 md:pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 md:mb-10">
        <div className="text-center">
          <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-ukraine-gold-500 text-ukraine-blue-900 rounded-full mb-3">
            {t('results.label')}
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 md:mb-4 font-display">
            {t('results.title')}
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto font-light">
            {t('results.description')}
          </p>
        </div>
      </div>
      <ProjectResultsMosaic />
    </section>
  )
}
