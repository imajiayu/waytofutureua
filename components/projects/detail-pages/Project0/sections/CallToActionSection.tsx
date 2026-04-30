'use client'

import { useTranslations } from 'next-intl'

import { HeartIcon } from '@/components/icons'

import type { SectionProps } from '../types'

export default function CallToActionSection({ content }: Pick<SectionProps, 'content'>) {
  const t = useTranslations('projects')

  if (!content.callToAction) {
    return null
  }

  return (
    <section className="border-t border-gray-100 pt-4">
      {/* Header */}
      <div className="mb-5 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ukraine-gold-500 to-orange-500 px-3 py-1.5 shadow-md">
          <HeartIcon className="h-4 w-4 text-white" />
          <span className="text-xs font-bold uppercase tracking-wide text-white">
            {t('project0.supportUs')}
          </span>
        </div>
        <h2 className="mb-2 font-display text-2xl font-bold text-gray-900 md:text-3xl">
          {content.callToAction.title}
        </h2>
        <p className="mx-auto max-w-xl text-sm text-gray-600 md:text-base">
          {content.callToAction.content}
        </p>
      </div>

      {/* Purpose Cards */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {content.callToAction.purposes.map((purpose, idx) => (
          <div
            key={idx}
            className="rounded-xl bg-gradient-to-br from-ukraine-gold-50/80 to-amber-50/50 p-4"
          >
            <div className="flex gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ukraine-gold-400 to-orange-500 shadow-md">
                <span className="font-display text-lg font-bold text-white">{idx + 1}</span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 font-display text-sm font-bold text-gray-900 md:text-base">
                  {purpose.title}
                </h3>
                <p className="text-xs leading-relaxed text-gray-600 md:text-sm">
                  {purpose.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Closing Statement */}
      <div className="text-center">
        <p className="mx-auto max-w-2xl text-sm italic leading-relaxed text-gray-700 md:text-base">
          &ldquo;{content.callToAction.closing}&rdquo;
        </p>
      </div>
    </section>
  )
}
