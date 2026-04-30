'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { MapPinIcon } from '@/components/icons'
import GlobalLoadingSpinner from '@/components/layout/GlobalLoadingSpinner'
import { usePathname, useRouter } from '@/i18n/navigation'
import { formatDate, getLocation, getProjectName, getUnitName } from '@/lib/i18n-utils'
import { getProjectProgress } from '@/lib/project-utils'
import type { AppLocale, ProjectStats } from '@/types'

import LongTermBadge from './LongTermBadge'
import ProjectStatusBadge from './ProjectStatusBadge'
import ProjectProgressBar from './shared/ProjectProgressBar'

interface ProjectCardProps {
  project: ProjectStats
  locale: string

  // Display mode
  mode?: 'full' | 'compact' // Default: 'full'

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
  const projectName = getProjectName(
    project.project_name_i18n,
    project.project_name,
    locale as AppLocale
  )
  const location = getLocation(project.location_i18n, project.location, locale as AppLocale)
  const unitName = getUnitName(project.unit_name_i18n, project.unit_name, locale as AppLocale)

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

  const { currentUnits, targetUnits, totalRaised, hasValidTarget, progressCurrent } =
    getProjectProgress(project)

  // ===================================================================
  // COMPACT MODE RENDERING
  // ===================================================================
  if (mode === 'compact') {
    return (
      <button
        type="button"
        onClick={handleSelectClick}
        className={`group relative h-fit w-64 flex-shrink-0 touch-manipulation select-none overflow-hidden rounded-2xl border-2 bg-[#1a1a1a] shadow-lg transition-[border-color,transform,box-shadow] duration-300 ${
          isSelected
            ? 'scale-105 border-ukraine-gold-400 shadow-ukraine-gold-500/30'
            : 'border-ukraine-blue-400/30 active:border-ukraine-gold-400/60 [@media(hover:hover)]:hover:border-ukraine-gold-400/60'
        } `}
      >
        {/* Background image container - inside border */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(/images/projects/project-${project.id}/card/bg.webp)`,
            backgroundColor: '#1a1a1a',
          }}
        />
        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/40 to-black/10" />

        {/* Content wrapper */}
        <div className="relative z-10 h-fit">
          {/* Header with Tags - Always Visible */}
          <div
            className={`border-b p-4 transition-colors ${isSelected ? 'border-ukraine-gold-400/50 bg-black/30 backdrop-blur-md' : 'border-white/10 bg-black/20 backdrop-blur-sm'} `}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-start gap-2">
                {/* Status Badge */}
                <ProjectStatusBadge status={project.status || 'active'} />

                {/* Long-term Badge */}
                {project.is_long_term === true && <LongTermBadge />}
              </div>

              {/* Selected Checkmark */}
              {isSelected && (
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ukraine-gold-500">
                  <svg
                    className="h-3 w-3 text-ukraine-blue-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>

            <h3
              className={`line-clamp-2 min-h-[2.5em] text-left font-display text-base font-bold leading-tight ${isSelected ? 'text-ukraine-gold-300' : 'text-white group-hover:text-ukraine-gold-300'} drop-shadow-md transition-colors`}
            >
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
                <MapPinIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/80 drop-shadow-md" />
                <span className="rounded bg-black/20 px-2 py-0.5 text-left text-sm font-medium text-white shadow-md backdrop-blur-sm">
                  {location}
                </span>
              </div>

              {/* Unit Price or Flexible Amount */}
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-white/80 drop-shadow-md"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {project.aggregate_donations ? (
                  <span className="rounded bg-black/20 px-2 py-0.5 text-left text-sm font-semibold text-ukraine-gold-300 shadow-md backdrop-blur-sm">
                    {t('anyAmount')}
                  </span>
                ) : (
                  <span className="rounded bg-black/20 px-2 py-0.5 text-left text-sm font-medium text-white shadow-md backdrop-blur-sm">
                    <span className="font-data font-semibold">
                      ${(project.unit_price || 0).toFixed(2)}
                    </span>{' '}
                    {t('perUnit', { unitName })}
                  </span>
                )}
              </div>

              {/* Start Date */}
              <div className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 flex-shrink-0 text-white/80 drop-shadow-md"
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
                <span className="rounded bg-black/20 px-2 py-0.5 text-left text-sm font-medium text-white shadow-md backdrop-blur-sm">
                  {t('startDate')}: {formatDate(project.start_date, locale as AppLocale)}
                </span>
              </div>

              {/* End Date - Only show for fixed-term projects */}
              {project.is_long_term !== true && (
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-white/80 drop-shadow-md"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <span className="rounded bg-black/20 px-2 py-0.5 text-left text-sm font-medium text-white shadow-md backdrop-blur-sm">
                    {t('endDate')}: {formatDate(project.end_date, locale as AppLocale)}
                  </span>
                </div>
              )}

              {/* Funding Information */}
              <div className="pt-2">
                {/* Show current units for long-term NON-aggregated projects */}
                {project.is_long_term === true && !project.aggregate_donations && (
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="rounded bg-black/20 px-2 py-0.5 text-white/80 shadow-md backdrop-blur-sm">
                      {t('currentUnits')}
                    </span>
                    <span className="rounded bg-black/20 px-2 py-0.5 font-data font-bold tabular-nums text-ukraine-gold-300 shadow-md backdrop-blur-sm">
                      {currentUnits} <span className="font-normal text-white/70">{unitName}</span>
                    </span>
                  </div>
                )}

                {/* Stats */}
                {project.is_long_term === true ? (
                  // Long-term: Larger stats card
                  <div className="rounded-xl bg-black/25 px-3 py-3 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-data text-2xl font-bold tabular-nums text-ukraine-gold-300 drop-shadow-md">
                          {project.donation_count || 0}
                        </span>
                        <span className="text-xs text-white/80">{t('donations')}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-data text-2xl font-bold tabular-nums tracking-tight text-ukraine-gold-300 drop-shadow-md">
                          $
                          {(project.total_raised || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-xs text-white/80">{t('raised')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Fixed-term: Compact stats row
                  <div className="mb-1 flex items-center justify-between rounded-lg bg-black/25 px-2 py-1.5 shadow-lg backdrop-blur-md">
                    <div className="flex items-baseline gap-1">
                      <span className="font-data text-lg font-bold tabular-nums text-ukraine-gold-300 drop-shadow-md">
                        {project.donation_count || 0}
                      </span>
                      <span className="text-xs text-white/80">{t('donations')}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-data text-lg font-bold tabular-nums tracking-tight text-ukraine-gold-300 drop-shadow-md">
                        $
                        {(project.total_raised || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
      <div className="group relative flex w-80 flex-shrink-0 transform flex-col overflow-hidden rounded-2xl border-2 border-ukraine-blue-400/30 bg-[#1a1a1a] shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-ukraine-gold-400/60">
        {/* Background image container - inside border */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(/images/projects/project-${project.id}/card/bg.webp)`,
            backgroundColor: '#1a1a1a',
          }}
        />
        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/40 to-black/10" />

        {/* Content wrapper */}
        <div className="relative z-10 flex h-full flex-col">
          {/* Header with Tags */}
          <div className="border-b border-white/10 bg-black/20 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-start justify-between gap-2">
              {/* Status Badge */}
              <ProjectStatusBadge status={project.status || 'active'} />

              {/* Long-term Badge */}
              {project.is_long_term === true && <LongTermBadge />}
            </div>

            <h3 className="line-clamp-2 min-h-[2.5em] font-display text-lg font-bold leading-tight text-white drop-shadow-md transition-colors group-hover:text-ukraine-gold-300">
              {projectName}
            </h3>
          </div>

          {/* Project Details */}
          <div className="flex-grow space-y-3 p-5">
            {/* Location */}
            <div className="flex items-start gap-2">
              <MapPinIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-white/80 drop-shadow-md" />
              <span className="rounded bg-black/20 px-2 py-1 text-sm font-medium text-white shadow-md backdrop-blur-sm">
                {location}
              </span>
            </div>

            {/* Unit Price or Flexible Amount */}
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 flex-shrink-0 text-white/80 drop-shadow-md"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {project.aggregate_donations ? (
                <span className="rounded bg-black/20 px-2 py-1 text-sm font-semibold text-ukraine-gold-300 shadow-md backdrop-blur-sm">
                  {t('anyAmount')}
                </span>
              ) : (
                <span className="rounded bg-black/20 px-2 py-1 text-sm font-medium text-white shadow-md backdrop-blur-sm">
                  <span className="font-data font-semibold">
                    ${(project.unit_price || 0).toFixed(2)}
                  </span>{' '}
                  {t('perUnit', { unitName })}
                </span>
              )}
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 flex-shrink-0 text-white/80 drop-shadow-md"
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
              <span className="rounded bg-black/20 px-2 py-1 text-sm font-medium text-white shadow-md backdrop-blur-sm">
                {t('startDate')}: {formatDate(project.start_date, locale as AppLocale)}
              </span>
            </div>

            {/* End Date - Only show for fixed-term projects */}
            {project.is_long_term !== true && (
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-white/80 drop-shadow-md"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
                <span className="rounded bg-black/20 px-2 py-1 text-sm font-medium text-white shadow-md backdrop-blur-sm">
                  {t('endDate')}: {formatDate(project.end_date, locale as AppLocale)}
                </span>
              </div>
            )}

            {/* Funding Information */}
            <div className="pt-3">
              {/* Show current units for long-term NON-aggregated projects */}
              {project.is_long_term === true && !project.aggregate_donations && (
                <div className="mb-2 flex items-baseline justify-between text-sm">
                  <span className="rounded bg-black/20 px-2 py-1 text-white/80 shadow-md backdrop-blur-sm">
                    {t('currentUnits')}
                  </span>
                  <span className="rounded bg-black/20 px-2 py-1 font-data font-bold tabular-nums text-ukraine-gold-300 shadow-md backdrop-blur-sm">
                    {currentUnits} <span className="font-normal text-white/80">{unitName}</span>
                  </span>
                </div>
              )}

              {/* Stats - Enhanced card for long-term projects (to fill space), compact for others */}
              {project.is_long_term === true ? (
                // Long-term: Larger stats card
                <div className="rounded-xl bg-black/25 px-4 py-4 shadow-lg backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-data text-3xl font-bold tabular-nums text-ukraine-gold-300 drop-shadow-md">
                        {project.donation_count || 0}
                      </span>
                      <span className="text-sm text-white/80">{t('donations')}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="font-data text-3xl font-bold tabular-nums tracking-tight text-ukraine-gold-300 drop-shadow-md">
                        $
                        {(project.total_raised || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-sm text-white/80">{t('raised')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Fixed-term: Compact stats row + progress bar
                <>
                  <div className="flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 shadow-lg backdrop-blur-md">
                    <div className="flex items-baseline gap-1">
                      <span className="font-data text-xl font-bold tabular-nums text-ukraine-gold-300 drop-shadow-md">
                        {project.donation_count || 0}
                      </span>
                      <span className="text-sm text-white/80">{t('donations')}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-data text-xl font-bold tabular-nums tracking-tight text-ukraine-gold-300 drop-shadow-md">
                        $
                        {(project.total_raised || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
          <div className="mt-auto p-5 pt-0">
            <button
              onClick={handleDonateClick}
              className="group/btn relative block w-full overflow-hidden rounded-xl bg-ukraine-gold-500 px-4 py-3 text-center font-semibold text-ukraine-blue-900 shadow-md transition-all duration-300 hover:bg-ukraine-gold-600 hover:shadow-xl"
            >
              <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-1000 group-hover/btn:translate-x-full"></div>
              <span className="relative z-10">{t('viewDetails')}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
