'use client'

import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import { useState, useEffect, useCallback } from 'react'
import type { ProjectStats } from '@/types'
import { getProjectName, getLocation, getUnitName, formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import { getProjectProgress } from '@/lib/project-utils'
import ProjectProgressBar from './shared/ProjectProgressBar'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import ProjectStatusBadge from './ProjectStatusBadge'
import { MapPinIcon } from '@/components/icons'
import LongTermBadge from './LongTermBadge'

interface ProjectCardProps {
  project: ProjectStats
  locale: string

  // Display mode
  mode?: 'full' | 'compact'  // Default: 'full'

  // Configuration
  showProgress?: boolean

  // Selection state (only for compact mode)
  isSelected?: boolean
  onSelect?: (id: number) => void

  // Force collapse details (used for scroll-based collapse on mobile)
  forceCollapse?: boolean
}

export default function ProjectCard({
  project,
  locale,
  mode = 'full',
  showProgress = true,
  isSelected = false,
  onSelect,
  forceCollapse = false,
}: ProjectCardProps) {
  // In compact mode on donate page: default expanded, collapse on scroll
  // forceCollapse=true means user scrolled down, so collapse
  // forceCollapse=false means at top or default, so expand
  const shouldExpandDetails = !forceCollapse

  const t = useTranslations('projects')
  const router = useRouter()
  const pathname = usePathname()
  const [isNavigating, setIsNavigating] = useState(false)

  // Reset loading state when pathname changes
  useEffect(() => {
    setIsNavigating(false)
  }, [pathname])

  // Get translated project data
  const projectName = getProjectName(project.project_name_i18n, project.project_name, locale as SupportedLocale)
  const location = getLocation(project.location_i18n, project.location, locale as SupportedLocale)
  const unitName = getUnitName(project.unit_name_i18n, project.unit_name, locale as SupportedLocale)

  // P2 优化: useCallback 避免不必要的重渲染
  const handleDonateClick = useCallback(() => {
    setIsNavigating(true)
    router.push(`/donate?project=${project.id}`)
  }, [router, project.id])

  // P2 优化: useCallback 避免不必要的重渲染
  const handleSelectClick = useCallback(() => {
    if (project.id !== null && project.id !== undefined && onSelect) {
      onSelect(project.id)
    }
  }, [project.id, onSelect])

  const { currentUnits, targetUnits, totalRaised, hasValidTarget, progressCurrent } = getProjectProgress(project)

  // ===================================================================
  // COMPACT MODE RENDERING
  // ===================================================================
  if (mode === 'compact') {
    return (
      <button
        type="button"
        onClick={handleSelectClick}
        className={`
          group flex-shrink-0 w-64 h-fit rounded-2xl border-2 overflow-hidden
          transition-[border-color,transform,box-shadow] duration-300 relative
          touch-manipulation select-none shadow-lg bg-[#1a1a1a]
          ${isSelected
            ? 'border-ukraine-gold-400 scale-105 shadow-ukraine-gold-500/30'
            : 'border-ukraine-blue-400/30 [@media(hover:hover)]:hover:border-ukraine-gold-400/60 active:border-ukraine-gold-400/60'
          }
        `}
      >
        {/* Background image container - inside border */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(/images/projects/project-${project.id}/card/bg.webp)`,
            backgroundColor: '#1a1a1a'
          }}
        />
        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/40 to-black/10" />

        {/* Content wrapper */}
        <div className="relative z-10 h-fit">
          {/* Header with Tags - Always Visible */}
          <div className={`
            p-4 border-b transition-colors
            ${isSelected ? 'bg-black/30 backdrop-blur-md border-ukraine-gold-400/50' : 'bg-black/20 backdrop-blur-sm border-white/10'}
          `}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2 flex-wrap">
                {/* Status Badge */}
                <ProjectStatusBadge status={project.status || 'active'} />

                {/* Long-term Badge */}
                {project.is_long_term === true && <LongTermBadge />}
              </div>

              {/* Selected Checkmark */}
              {isSelected && (
                <div className="flex-shrink-0 w-5 h-5 bg-ukraine-gold-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-ukraine-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>

            <h3 className={`
              text-base font-bold leading-tight line-clamp-2 min-h-[2.5em] text-left font-display
              ${isSelected ? 'text-ukraine-gold-300' : 'text-white group-hover:text-ukraine-gold-300'}
              transition-colors drop-shadow-md
            `}>
              {projectName}
            </h3>
          </div>

          {/* Details - Animated collapse */}
          <div
            className="overflow-hidden px-4"
            style={{
              maxHeight: shouldExpandDetails ? '500px' : '0px',
              paddingTop: shouldExpandDetails ? '8px' : '0px',
              paddingBottom: shouldExpandDetails ? '16px' : '0px',
              opacity: shouldExpandDetails ? 1 : 0,
              transition: 'max-height 0.3s ease, padding 0.3s ease, opacity 0.3s ease',
            }}
          >
            <div className="space-y-2">
              {/* Location */}
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0 drop-shadow-md" />
                <span className="text-sm text-white font-medium text-left px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded shadow-md">{location}</span>
              </div>

              {/* Unit Price or Flexible Amount */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80 flex-shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {project.aggregate_donations ? (
                  <span className="text-sm font-semibold text-ukraine-gold-300 text-left px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded shadow-md">
                    {t('anyAmount')}
                  </span>
                ) : (
                  <span className="text-sm text-white font-medium text-left px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded shadow-md">
                    <span className="font-semibold font-data">${(project.unit_price || 0).toFixed(2)}</span>
                    {' '}{t('perUnit', { unitName })}
                  </span>
                )}
              </div>

              {/* Start Date */}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/80 flex-shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-white font-medium text-left px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded shadow-md">
                  {t('startDate')}: {formatDate(project.start_date, locale as SupportedLocale)}
                </span>
              </div>

              {/* End Date - Only show for fixed-term projects */}
              {project.is_long_term !== true && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/80 flex-shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-sm text-white font-medium text-left px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded shadow-md">
                    {t('endDate')}: {formatDate(project.end_date, locale as SupportedLocale)}
                  </span>
                </div>
              )}

              {/* Funding Information */}
              <div className="pt-2">
                {/* Show current units for long-term NON-aggregated projects */}
                {project.is_long_term === true && !project.aggregate_donations && (
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="text-white/80 px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded shadow-md">{t('currentUnits')}</span>
                    <span className="font-data font-bold text-ukraine-gold-300 tabular-nums px-2 py-0.5 bg-black/20 backdrop-blur-sm rounded shadow-md">
                      {currentUnits} <span className="font-normal text-white/70">{unitName}</span>
                    </span>
                  </div>
                )}

                {/* Stats */}
                {project.is_long_term === true ? (
                  // Long-term: Larger stats card
                  <div className="bg-black/25 backdrop-blur-md px-3 py-3 rounded-xl shadow-lg">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-data text-2xl font-bold text-ukraine-gold-300 tabular-nums drop-shadow-md">{project.donation_count || 0}</span>
                        <span className="text-xs text-white/80">{t('donations')}</span>
                      </div>
                      <div className="text-right flex flex-col">
                        <span className="font-data text-2xl font-bold text-ukraine-gold-300 tabular-nums tracking-tight drop-shadow-md">
                          ${(project.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-white/80">{t('raised')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Fixed-term: Compact stats row
                  <div className="flex justify-between items-center bg-black/25 backdrop-blur-md px-2 py-1.5 rounded-lg shadow-lg mb-1">
                    <div className="flex items-baseline gap-1">
                      <span className="font-data text-lg font-bold text-ukraine-gold-300 tabular-nums drop-shadow-md">{project.donation_count || 0}</span>
                      <span className="text-xs text-white/80">{t('donations')}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-data text-lg font-bold text-ukraine-gold-300 tabular-nums tracking-tight drop-shadow-md">
                        ${(project.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar - Only show for fixed-term projects with valid targets */}
              {project.is_long_term !== true && hasValidTarget && (
                <ProjectProgressBar
                  current={progressCurrent}
                  target={targetUnits}
                  unitName={unitName}
                  showAsAmount={project.aggregate_donations ?? false}
                  className="mt-1"
                />
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  // ===================================================================
  // FULL MODE RENDERING
  // ===================================================================

  return (
    <>
      <GlobalLoadingSpinner isLoading={isNavigating} />
      <div
        className="group flex-shrink-0 w-80 rounded-2xl border-2 border-ukraine-blue-400/30 hover:border-ukraine-gold-400/60 transition-all duration-300 transform hover:-translate-y-2 overflow-hidden relative flex flex-col shadow-lg bg-[#1a1a1a]"
      >
      {/* Background image container - inside border */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(/images/projects/project-${project.id}/card/bg.webp)`,
          backgroundColor: '#1a1a1a'
        }}
      />
      {/* Gradient overlay for text contrast */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/40 to-black/10" />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header with Tags */}
        <div className="p-5 border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2 mb-3">
            {/* Status Badge */}
            <ProjectStatusBadge status={project.status || 'active'} />

            {/* Long-term Badge */}
            {project.is_long_term === true && <LongTermBadge />}
          </div>

          <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 min-h-[2.5em] group-hover:text-ukraine-gold-300 transition-colors font-display drop-shadow-md">
            {projectName}
          </h3>
        </div>

        {/* Project Details */}
        <div className="p-5 space-y-3 flex-grow">
          {/* Location */}
          <div className="flex items-start gap-2">
            <MapPinIcon className="w-5 h-5 text-white/80 mt-0.5 flex-shrink-0 drop-shadow-md" />
            <span className="text-sm text-white font-medium px-2 py-1 bg-black/20 backdrop-blur-sm rounded shadow-md">{location}</span>
          </div>

          {/* Unit Price or Flexible Amount */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white/80 flex-shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {project.aggregate_donations ? (
              <span className="text-sm font-semibold text-ukraine-gold-300 px-2 py-1 bg-black/20 backdrop-blur-sm rounded shadow-md">
                {t('anyAmount')}
              </span>
            ) : (
              <span className="text-sm text-white font-medium px-2 py-1 bg-black/20 backdrop-blur-sm rounded shadow-md">
                <span className="font-semibold font-data">${(project.unit_price || 0).toFixed(2)}</span>
                {' '}{t('perUnit', { unitName })}
              </span>
            )}
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white/80 flex-shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-white font-medium px-2 py-1 bg-black/20 backdrop-blur-sm rounded shadow-md">
              {t('startDate')}: {formatDate(project.start_date, locale as SupportedLocale)}
            </span>
          </div>

          {/* End Date - Only show for fixed-term projects */}
          {project.is_long_term !== true && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white/80 flex-shrink-0 drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-sm text-white font-medium px-2 py-1 bg-black/20 backdrop-blur-sm rounded shadow-md">
                {t('endDate')}: {formatDate(project.end_date, locale as SupportedLocale)}
              </span>
            </div>
          )}

          {/* Funding Information */}
          <div className="pt-3">
            {/* Show current units for long-term NON-aggregated projects */}
            {project.is_long_term === true && !project.aggregate_donations && (
              <div className="flex justify-between items-baseline text-sm mb-2">
                <span className="text-white/80 px-2 py-1 bg-black/20 backdrop-blur-sm rounded shadow-md">{t('currentUnits')}</span>
                <span className="font-data font-bold text-ukraine-gold-300 tabular-nums px-2 py-1 bg-black/20 backdrop-blur-sm rounded shadow-md">
                  {currentUnits} <span className="font-normal text-white/80">{unitName}</span>
                </span>
              </div>
            )}

            {/* Stats - Enhanced card for long-term projects (to fill space), compact for others */}
            {project.is_long_term === true ? (
              // Long-term: Larger stats card
              <div className="bg-black/25 backdrop-blur-md px-4 py-4 rounded-xl shadow-lg">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-data text-3xl font-bold text-ukraine-gold-300 tabular-nums drop-shadow-md">{project.donation_count || 0}</span>
                    <span className="text-sm text-white/80">{t('donations')}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="font-data text-3xl font-bold text-ukraine-gold-300 tabular-nums tracking-tight drop-shadow-md">
                      ${(project.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-sm text-white/80">{t('raised')}</span>
                  </div>
                </div>
              </div>
            ) : (
              // Fixed-term: Compact stats row + progress bar
              <>
                <div className="flex justify-between items-center bg-black/25 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg">
                  <div className="flex items-baseline gap-1">
                    <span className="font-data text-xl font-bold text-ukraine-gold-300 tabular-nums drop-shadow-md">{project.donation_count || 0}</span>
                    <span className="text-sm text-white/80">{t('donations')}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-data text-xl font-bold text-ukraine-gold-300 tabular-nums tracking-tight drop-shadow-md">
                      ${(project.total_raised || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {showProgress && hasValidTarget && (
                  <ProjectProgressBar
                    current={progressCurrent}
                    target={targetUnits}
                    unitName={unitName}
                    showAsAmount={project.aggregate_donations ?? false}
                    className="mt-2"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Action Button - Fixed at bottom */}
        <div className="p-5 pt-0 mt-auto">
          <button
            onClick={handleDonateClick}
            className="group/btn relative block w-full text-center py-3 px-4 bg-ukraine-gold-500 text-ukraine-blue-900 rounded-xl font-semibold hover:bg-ukraine-gold-600 hover:shadow-xl transition-all duration-300 shadow-md overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
            <span className="relative z-10">{t('viewDetails')}</span>
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
