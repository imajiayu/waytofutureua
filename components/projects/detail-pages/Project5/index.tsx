'use client'

import { useState, useEffect } from 'react'
import ProjectProgressSection from '@/components/projects/shared/ProjectProgressSection'
import { FadeInSection } from '@/components/projects/shared'
import { clientLogger } from '@/lib/logger-client'
import type { Project5Content, Project5DetailContentProps } from './types'
import { HeroSection } from './sections'

export default function Project5DetailContent({ project, locale }: Project5DetailContentProps) {
  const [content, setContent] = useState<Project5Content | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(`/content/projects/project-5-${locale}.json`)
        if (response.ok) {
          setContent(await response.json())
        } else {
          clientLogger.warn('UI', 'No content found for project-5', { locale })
        }
      } catch (error) {
        clientLogger.error('UI', 'Error loading project content', {
          project: 5,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [locale])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative h-[45vh] min-h-[320px] rounded-xl overflow-hidden bg-gradient-to-br from-stone-100 to-orange-100 animate-pulse">
          <div className="absolute inset-0 flex items-end p-4">
            <div className="space-y-2 w-full max-w-xl">
              <div className="h-7 bg-white/30 rounded w-3/4" />
              <div className="h-4 bg-white/20 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden p-8">
        <p className="text-gray-600 text-center">Content not available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <HeroSection content={content} project={project} locale={locale} />

      {/* Progress */}
      <FadeInSection>
        <ProjectProgressSection project={project} locale={locale} />
      </FadeInSection>
    </div>
  )
}
