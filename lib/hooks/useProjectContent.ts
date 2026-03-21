'use client'

import { useState, useEffect } from 'react'
import { clientLogger } from '@/lib/logger-client'

interface UseProjectContentResult<T> {
  data: T | null
  loading: boolean
}

/**
 * Load a single project content JSON file
 */
export function useProjectContent<T>(
  url: string,
  projectId: number
): UseProjectContentResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    const load = async () => {
      try {
        const response = await fetch(url)
        if (response.ok) {
          setData(await response.json())
        } else {
          clientLogger.warn('UI', `No content found for project-${projectId}`, { url })
        }
      } catch (error) {
        clientLogger.error('UI', 'Error loading project content', {
          project: projectId,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [url, projectId])

  return { data, loading }
}

/**
 * Load multiple project content JSON files in parallel
 */
export function useProjectContents<T extends any[]>(
  configs: { url: string; projectId: number }[]
): { data: { [K in keyof T]: T[K] | null }; loading: boolean } {
  const [data, setData] = useState<any[]>(() => configs.map(() => null))
  const [loading, setLoading] = useState(true)

  const configKey = configs.map(c => c.url).join('|')

  useEffect(() => {
    setLoading(true)
    setData(configs.map(() => null))
    const load = async () => {
      try {
        const results = await Promise.all(
          configs.map(async (config) => {
            try {
              const response = await fetch(config.url)
              if (response.ok) {
                return await response.json()
              }
              clientLogger.warn('UI', `No content found for project-${config.projectId}`, { url: config.url })
              return null
            } catch (error) {
              clientLogger.error('UI', 'Error loading project content', {
                project: config.projectId,
                error: error instanceof Error ? error.message : String(error),
              })
              return null
            }
          })
        )
        setData(results)
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey])

  return { data: data as any, loading }
}
