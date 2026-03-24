'use client'

import { useTranslations } from 'next-intl'
import ProjectProgressBar from './ProjectProgressBar'
import ProjectStatusBadge from '../ProjectStatusBadge'
import LongTermBadge from '../LongTermBadge'
import type { ProjectStats } from '@/types'
import { MapPinIcon } from '@/components/icons'
import { getLocation, getUnitName, formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import { getProjectProgress } from '@/lib/project-utils'

interface ProjectProgressSectionProps {
  project: ProjectStats
  locale: string
}


export default function ProjectProgressSection({ project, locale }: ProjectProgressSectionProps) {
  const t = useTranslations('projects')

  const location = getLocation(project.location_i18n, project.location, locale as SupportedLocale)
  const unitName = getUnitName(project.unit_name_i18n, project.unit_name, locale as SupportedLocale)
  const { currentUnits, targetUnits, totalRaised, hasValidTarget, progressCurrent } = getProjectProgress(project)

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-ukraine-blue-500 px-3 md:px-4 py-2 md:py-3 text-white">
        <h2 className="text-lg md:text-xl font-bold font-display">
          {t('projectProgress')}
        </h2>
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 space-y-2 md:space-y-3">
        {/* Status and Long-term Badges */}
        <div className="flex flex-wrap gap-1.5">
          <ProjectStatusBadge status={project.status || 'active'} />
          {project.is_long_term === true && <LongTermBadge />}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Location */}
          <div className="flex items-start gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-[10px] md:text-xs text-gray-700 leading-tight">{location}</span>
          </div>

          {/* Dates */}
          <div className="flex items-start gap-1.5">
            <svg
              className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 mt-0.5 flex-shrink-0"
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
            <span className="text-[10px] md:text-xs text-gray-700 leading-tight">
              <span className="font-medium">
                {formatDate(project.start_date, locale as SupportedLocale)}
              </span>
              {project.is_long_term !== true && (
                <>
                  {' '}
                  →{' '}
                  <span className="font-medium">
                    {formatDate(project.end_date, locale as SupportedLocale)}
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-2 mt-2">
          {/* Funding Information */}
          <div className="space-y-2">
            {/* Show current units for long-term NON-aggregated projects */}
            {project.is_long_term === true && !project.aggregate_donations && (
              <div className="flex justify-between items-baseline text-xs md:text-sm">
                <span className="text-gray-500">{t('currentUnits')}</span>
                <span className="font-data font-bold text-ukraine-gold-600 tabular-nums">
                  {currentUnits} <span className="font-normal text-gray-400">{unitName}</span>
                </span>
              </div>
            )}

            {/* Stats - Enhanced card for long-term projects, compact for others */}
            {project.is_long_term === true ? (
              // Long-term: Larger stats card (no progress bar needed)
              <div className="bg-gradient-to-br from-ukraine-gold-50 to-ukraine-gold-100/50 -mx-1.5 px-3 py-3 rounded-xl border border-ukraine-gold-200/60 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-data text-2xl md:text-3xl font-bold text-ukraine-gold-600 tabular-nums">{project.donation_count || 0}</span>
                    <span className="text-xs md:text-sm text-gray-500">{t('donations')}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="font-data text-2xl md:text-3xl font-bold text-ukraine-gold-600 tabular-nums tracking-tight">
                      ${(project.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs md:text-sm text-gray-500">{t('raised')}</span>
                  </div>
                </div>
              </div>
            ) : (
              // Fixed-term: Compact stats row + progress bar
              <>
                <div className="flex justify-between items-center bg-gradient-to-r from-ukraine-gold-50 via-ukraine-gold-50/50 to-transparent -mx-1.5 px-2 py-1.5 rounded-lg border border-ukraine-gold-100/50">
                  <div className="flex items-baseline gap-1">
                    <span className="font-data text-lg md:text-xl font-bold text-ukraine-gold-600 tabular-nums">{project.donation_count || 0}</span>
                    <span className="text-xs md:text-sm text-gray-500">{t('donations')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-data text-lg md:text-xl font-bold text-ukraine-gold-600 tabular-nums tracking-tight">
                      ${(project.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
