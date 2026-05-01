'use client'

import { useTranslations } from 'next-intl'

import { MapPinIcon } from '@/components/icons'
import { formatDate, getTranslatedText } from '@/lib/i18n-utils'
import { getProjectProgress } from '@/lib/project-utils'
import type { AppLocale, ProjectStats } from '@/types'

import LongTermBadge from '../LongTermBadge'
import ProjectStatusBadge from '../ProjectStatusBadge'
import ProjectProgressBar from './ProjectProgressBar'

interface ProjectProgressSectionProps {
  project: ProjectStats
  locale: string
}

export default function ProjectProgressSection({ project, locale }: ProjectProgressSectionProps) {
  const t = useTranslations('projects')

  const location = getTranslatedText(project.location_i18n, project.location, locale as AppLocale)
  const unitName = getTranslatedText(project.unit_name_i18n, project.unit_name, locale as AppLocale)
  const { currentUnits, targetUnits, totalRaised, hasValidTarget, progressCurrent } =
    getProjectProgress(project)

  return (
    <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="bg-ukraine-blue-500 px-3 py-2 text-white md:px-4 md:py-3">
        <h2 className="font-display text-lg font-bold md:text-xl">{t('projectProgress')}</h2>
      </div>

      {/* Content */}
      <div className="space-y-2 p-3 md:space-y-3 md:p-4">
        {/* Status and Long-term Badges */}
        <div className="flex flex-wrap gap-1.5">
          <ProjectStatusBadge status={project.status || 'active'} />
          {project.is_long_term === true && <LongTermBadge />}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {/* Location */}
          <div className="flex items-start gap-1.5">
            <MapPinIcon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400 md:h-4 md:w-4" />
            <span className="text-[10px] leading-tight text-gray-700 md:text-xs">{location}</span>
          </div>

          {/* Dates */}
          <div className="flex items-start gap-1.5">
            <svg
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400 md:h-4 md:w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[10px] leading-tight text-gray-700 md:text-xs">
              <span className="font-medium">
                {formatDate(project.start_date, locale as AppLocale)}
              </span>
              {project.is_long_term !== true && (
                <>
                  {' '}
                  →{' '}
                  <span className="font-medium">
                    {formatDate(project.end_date, locale as AppLocale)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-2 border-t border-gray-200 pt-2">
          {/* Funding Information */}
          <div className="space-y-2">
            {/* Show current units for long-term NON-aggregated projects */}
            {project.is_long_term === true && !project.aggregate_donations && (
              <div className="flex items-baseline justify-between text-xs md:text-sm">
                <span className="text-gray-500">{t('currentUnits')}</span>
                <span className="font-data font-bold tabular-nums text-ukraine-gold-600">
                  {currentUnits} <span className="font-normal text-gray-400">{unitName}</span>
                </span>
              </div>
            )}

            {/* Stats - Enhanced card for long-term projects, compact for others */}
            {project.is_long_term === true ? (
              // Long-term: Larger stats card (no progress bar needed)
              <div className="-mx-1.5 rounded-xl border border-ukraine-gold-200/60 bg-gradient-to-br from-ukraine-gold-50 to-ukraine-gold-100/50 px-3 py-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-data text-2xl font-bold tabular-nums text-ukraine-gold-600 md:text-3xl">
                      {project.donation_count || 0}
                    </span>
                    <span className="text-xs text-gray-500 md:text-sm">{t('donations')}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-data text-2xl font-bold tabular-nums tracking-tight text-ukraine-gold-600 md:text-3xl">
                      $
                      {(project.total_raised || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs text-gray-500 md:text-sm">{t('raised')}</span>
                  </div>
                </div>
              </div>
            ) : (
              // Fixed-term: Compact stats row + progress bar
              <>
                <div className="-mx-1.5 flex items-center justify-between rounded-lg border border-ukraine-gold-100/50 bg-gradient-to-r from-ukraine-gold-50 via-ukraine-gold-50/50 to-transparent px-2 py-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className="font-data text-lg font-bold tabular-nums text-ukraine-gold-600 md:text-xl">
                      {project.donation_count || 0}
                    </span>
                    <span className="text-xs text-gray-500 md:text-sm">{t('donations')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-data text-lg font-bold tabular-nums tracking-tight text-ukraine-gold-600 md:text-xl">
                      $
                      {(project.total_raised || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {hasValidTarget && (
                  <ProjectProgressBar
                    current={progressCurrent}
                    target={targetUnits}
                    unitName={unitName}
                    showAsAmount={project.aggregate_donations ?? false}
                    className="mt-1"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
