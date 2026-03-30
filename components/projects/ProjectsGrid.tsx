import { getLocale, getTranslations } from 'next-intl/server'
import { getAllProjectsWithStats } from '@/lib/supabase/queries'
import ProjectCard from '@/components/projects/ProjectCard'
import type { ProjectStats } from '@/types'
import { logger } from '@/lib/logger'

export default async function ProjectsGrid() {
  const t = await getTranslations('home')
  const locale = await getLocale()

  // Add error handling for Supabase requests
  let projects: ProjectStats[] = []
  try {
    projects = await getAllProjectsWithStats()
  } catch (error) {
    logger.errorWithStack('DB', 'Failed to fetch projects', error)
    projects = []
  }

  return (
    <div className="w-full">
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('noProjects')}</p>
        </div>
      ) : (
        <div className="relative">
          {/* Horizontal Scrolling Container */}
          <div className="overflow-x-auto pb-4 pt-2 scrollbar-hide">
            <div className="flex gap-6 min-w-min px-6">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  locale={locale}
                  showProgress={true}
                />
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
