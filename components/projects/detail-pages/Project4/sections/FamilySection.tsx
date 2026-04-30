'use client'

import { useTranslations } from 'next-intl'

import { SectionHeader } from '@/components/projects/shared'

import type { SectionProps } from '../types'

export default function FamilySection({ content }: SectionProps) {
  const t = useTranslations('projects.project4')

  return (
    <section className="space-y-4">
      <SectionHeader title={t('familyMembers')} gradientClassName="from-amber-500 to-orange-600" />

      {/* Parents & Grandmother - Responsive grid */}
      <div className="rounded-xl border border-amber-100/50 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-4">
        <div className="space-y-3">
          {/* Mother */}
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5">
            <span className="whitespace-nowrap text-sm font-medium text-amber-700">
              {t('mother')}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="font-medium text-gray-900">{content.family.mother.name}</span>
              <span className="text-xs text-gray-400">({content.family.mother.nameOriginal})</span>
              {content.family.mother.description && (
                <span className="text-sm text-gray-500">— {content.family.mother.description}</span>
              )}
            </div>
          </div>
          {/* Father */}
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5">
            <span className="whitespace-nowrap text-sm font-medium text-stone-500">
              {t('father')}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="font-medium text-gray-900">{content.family.father.name}</span>
              <span className="text-xs text-gray-400">({content.family.father.nameOriginal})</span>
              {content.family.father.description && (
                <span className="text-sm text-gray-500">— {content.family.father.description}</span>
              )}
            </div>
          </div>
          {/* Grandmother */}
          <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5">
            <span className="whitespace-nowrap text-sm font-medium text-purple-600">
              {t('grandmother')}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              <span className="font-medium text-gray-900">{content.family.grandmother.name}</span>
              <span className="text-xs text-gray-400">
                ({content.family.grandmother.nameOriginal})
              </span>
              {content.family.grandmother.description && (
                <span className="text-sm text-gray-500">
                  — {content.family.grandmother.description}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Children Lists */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* Boys */}
        <div className="rounded-xl border border-blue-100/50 bg-blue-50/50 p-4">
          <span className="mb-2 block text-sm font-medium text-blue-700">{t('boys')}</span>
          <div className="flex flex-wrap gap-2">
            {content.children.boys.map((child, idx) => (
              <span key={idx} className="text-sm text-gray-700">
                {child.name} <span className="text-gray-400">({child.nameOriginal})</span>
                {idx < content.children.boys.length - 1 && (
                  <span className="ml-1 text-gray-300">·</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Girls */}
        <div className="rounded-xl border border-pink-100/50 bg-pink-50/50 p-4">
          <span className="mb-2 block text-sm font-medium text-pink-700">{t('girls')}</span>
          <div className="flex flex-wrap gap-2">
            {content.children.girls.map((child, idx) => (
              <span key={idx} className="text-sm text-gray-700">
                {child.name} <span className="text-gray-400">({child.nameOriginal})</span>
                {idx < content.children.girls.length - 1 && (
                  <span className="ml-1 text-gray-300">·</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
