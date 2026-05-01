'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import DonationFormCard from '@/components/donate-form/DonationFormCard'
import { ChevronDownIcon, ChevronUpIcon } from '@/components/icons'
import ProjectsGallery from '@/components/projects/ProjectsGallery'
import type { ProjectStats } from '@/types'
import type { DonorInfo } from '@/types/dtos'

// P0-8 优化: 项目详情组件按需加载（每次渲染只用 1 个，4 个全静态 import 浪费首屏 bundle）
const detailLoading = () => <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
const Project0DetailContent = dynamic(() => import('@/components/projects/detail-pages/Project0'), {
  ssr: true,
  loading: detailLoading,
})
const Project3DetailContent = dynamic(() => import('@/components/projects/detail-pages/Project3'), {
  ssr: true,
  loading: detailLoading,
})
const Project4DetailContent = dynamic(() => import('@/components/projects/detail-pages/Project4'), {
  ssr: true,
  loading: detailLoading,
})
const Project5DetailContent = dynamic(() => import('@/components/projects/detail-pages/Project5'), {
  ssr: true,
  loading: detailLoading,
})
// P2 优化: 动态加载折叠区域组件（默认折叠，用户点击后才显示）
const DonationStatusFlow = dynamic(
  () => import('@/components/donation-display/DonationStatusFlow'),
  { ssr: true, loading: () => <div className="h-24 animate-pulse rounded-lg bg-gray-100" /> }
)

// P2 优化: 动态加载页面底部组件（滚动后才可见）
const ProjectDonationList = dynamic(
  () => import('@/components/donation-display/ProjectDonationList'),
  { ssr: true, loading: () => <div className="h-32 animate-pulse rounded-lg bg-gray-100" /> }
)

import { useBidirectionalSticky } from '@/lib/hooks/useBidirectionalSticky'
import { useHideAtFooter } from '@/lib/hooks/useHideAtFooter'
import { getTranslatedText } from '@/lib/i18n-utils'
import type { AppLocale } from '@/types'

// P2 优化: 动态加载 BottomSheet 组件（仅移动端使用）
const BottomSheet = dynamic(() => import('@/components/common/BottomSheet'), {
  ssr: false,
  loading: () => null, // 加载时不显示占位符
})

/**
 * Project Detail Component Registry
 *
 * Each project has its own dedicated detail page component.
 * To add a new project:
 * 1. Create component in components/projects/detail-pages/ProjectN/index.tsx
 * 2. Export from components/projects/detail-pages/index.ts
 * 3. Add case to this switch statement
 */
function renderProjectDetail(
  projectId: number,
  project: ProjectStats,
  locale: string,
  t: (key: string) => string
): React.ReactNode {
  const key = `detail-${projectId}`

  switch (projectId) {
    case 0:
      return <Project0DetailContent key={key} project={project} locale={locale} />
    case 3:
      return <Project3DetailContent key={key} project={project} locale={locale} />
    case 4:
      return <Project4DetailContent key={key} project={project} locale={locale} />
    case 5:
      return <Project5DetailContent key={key} project={project} locale={locale} />
    default:
      // Fallback for projects without dedicated detail pages
      return (
        <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-gray-600">{t('detailsComingSoon')}</p>
        </div>
      )
  }
}

interface DonatePageClientProps {
  projects: ProjectStats[]
  locale: string
  initialProjectId: number | null
}

export default function DonatePageClient({
  projects: initialProjects,
  locale,
  initialProjectId,
}: DonatePageClientProps) {
  const t = useTranslations('donate')
  const [projects, setProjects] = useState<ProjectStats[]>(initialProjects)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(initialProjectId)
  const [isFlowExpanded, setIsFlowExpanded] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(true) // Default open on mobile
  const hideSheetAtBottom = useHideAtFooter()
  const [expandSheetTrigger, setExpandSheetTrigger] = useState(0)

  // Shared form fields state (preserved across project switches)
  // Only preserve donor personal information, NOT project-specific fields
  const [donorInfo, setDonorInfo] = useState<DonorInfo>({
    name: '',
    email: '',
    message: '',
    telegram: '',
    whatsapp: '',
    subscribeToNewsletter: true,
  })
  const updateDonorInfo = useCallback(<K extends keyof DonorInfo>(key: K, value: DonorInfo[K]) => {
    setDonorInfo((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Constants
  const MOBILE_BREAKPOINT = 1024 // lg breakpoint
  const NAV_HEIGHT = 96 // top-24 = 6rem = 96px
  const BOTTOM_PADDING = 40 // padding from viewport bottom

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null

  // Refs for bidirectional sticky sidebar
  const sidebarRef = useRef<HTMLDivElement>(null)
  const sidebarInnerRef = useRef<HTMLDivElement>(null)
  const stickyTop = useBidirectionalSticky({
    innerRef: sidebarInnerRef,
    navHeight: NAV_HEIGHT,
    bottomPadding: BOTTOM_PADDING,
    desktopBreakpoint: MOBILE_BREAKPOINT,
    deps: [selectedProjectId],
  })

  // Listen for navigation donate button click to expand sheet
  useEffect(() => {
    const handleOpenDonationForm = () => {
      if (selectedProjectId !== null) {
        setExpandSheetTrigger((prev) => prev + 1)
      }
    }

    window.addEventListener('open-donation-form', handleOpenDonationForm)
    return () => {
      window.removeEventListener('open-donation-form', handleOpenDonationForm)
    }
  }, [selectedProjectId])

  // Callback to update all projects stats
  const handleProjectsUpdate = (updatedProjects: ProjectStats[]) => {
    setProjects(updatedProjects)
  }

  // Handle project selection
  const handleProjectSelect = (id: number) => {
    setSelectedProjectId(id)
    // 同步更新 URL，这样语言切换时能保留项目选择
    const url = new URL(window.location.href)
    url.searchParams.set('project', id.toString())
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Project Selection Gallery */}
      <ProjectsGallery
        projects={projects}
        locale={locale}
        mode="compact"
        selectedProjectId={selectedProjectId}
        onProjectSelect={handleProjectSelect}
      />

      {/* Main Content Area */}
      <div
        id="donation-content"
        className="mx-auto max-w-7xl px-4 pb-6 pt-2 md:px-6 md:pb-10 md:pt-4"
      >
        {selectedProject && selectedProjectId !== null ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5">
              {/* Left Side: Project Detail Content (60%) */}
              <div className="space-y-3 md:space-y-4 lg:col-span-3">
                {/* Render project-specific detail component */}
                {renderProjectDetail(selectedProjectId, selectedProject, locale, t)}
              </div>

              {/* Right Side: Donation Form (40%) - Desktop Only */}
              <div ref={sidebarRef} className="hidden lg:col-span-2 lg:block" id="donation-form">
                <div ref={sidebarInnerRef} className="lg:sticky" style={{ top: stickyTop }}>
                  <DonationFormCard
                    project={selectedProject}
                    locale={locale}
                    onProjectsUpdate={handleProjectsUpdate}
                    donorInfo={donorInfo}
                    updateDonorInfo={updateDonorInfo}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Only: Bottom Sheet with Donation Form */}
            <div className="lg:hidden">
              <BottomSheet
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                snapPoints={[0.15, 1]} // Minimized (15%) and Full (100% - nav)
                minimizedHint={t('donateNowButton')}
                hideWhenMinimized={hideSheetAtBottom}
                expandTrigger={expandSheetTrigger}
              >
                <div className="px-4 pb-4 pt-1">
                  <DonationFormCard
                    project={selectedProject}
                    locale={locale}
                    onProjectsUpdate={handleProjectsUpdate}
                    donorInfo={donorInfo}
                    updateDonorInfo={updateDonorInfo}
                  />
                </div>
              </BottomSheet>
            </div>
          </>
        ) : (
          <EmptyState locale={locale} />
        )}

        {/* Full Width: Donation Process Flow */}
        <div className="mt-8 border-t-2 border-gray-200 pt-8 md:mt-16 md:pt-16">
          <div className="mb-6 text-center md:mb-8">
            <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
              {t('trackDonationTitle')}
            </h2>
            <p className="mx-auto mb-6 max-w-2xl text-lg text-gray-600">
              {t('trackDonationDescription')}
            </p>

            {/* Toggle Button */}
            <button
              onClick={() => setIsFlowExpanded(!isFlowExpanded)}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-ukraine-blue-500 bg-white px-6 py-3 font-medium text-ukraine-blue-500 transition-colors hover:bg-ukraine-blue-50"
            >
              {isFlowExpanded ? (
                <>
                  {t('hideDetails')}
                  <ChevronUpIcon className="h-5 w-5" />
                </>
              ) : (
                <>
                  {t('showDetails')}
                  <ChevronDownIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </div>

          {/* Collapsible Content */}
          {isFlowExpanded && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <DonationStatusFlow />
            </div>
          )}
        </div>

        {/* Project Donations List */}
        {selectedProjectId !== null && selectedProject && (
          <div className="mt-8 md:mt-12">
            <ProjectDonationList
              key={`donations-${selectedProjectId}`}
              projectId={selectedProjectId}
              projectName={getTranslatedText(
                selectedProject.project_name_i18n,
                selectedProject.project_name,
                locale as AppLocale
              )}
              locale={locale}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Empty state when no project is selected
function EmptyState({ locale }: { locale: string }) {
  const t = useTranslations('donate.emptyState')

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-ukraine-blue-100 to-ukraine-gold-100">
        <svg
          className="h-10 w-10 text-ukraine-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 11l5-5m0 0l5 5m-5-5v12"
          />
        </svg>
      </div>
      <h3 className="mb-3 font-display text-2xl font-bold text-gray-900">{t('title')}</h3>
      <p className="max-w-md text-gray-600">{t('description')}</p>
      <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        <span>{t('scrollHint')}</span>
      </div>
    </div>
  )
}
