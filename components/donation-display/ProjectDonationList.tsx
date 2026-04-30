'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { clientLogger } from '@/lib/logger-client'

import DonationResultViewer from './DonationResultViewer'
import DonationCardMobile from './project-donations/DonationCardMobile'
import DonationTableDesktop from './project-donations/DonationTableDesktop'
import type { ProjectDonation } from './project-donations/types'

interface ProjectDonationListProps {
  projectId: number | null
  projectName: string
  locale?: string
}

const groupDonationsByOrder = (donations: ProjectDonation[]): ProjectDonation[][] => {
  const groups: { [key: string]: ProjectDonation[] } = {}
  donations.forEach((donation) => {
    const orderId = donation.order_id
    if (!groups[orderId]) groups[orderId] = []
    groups[orderId].push(donation)
  })
  return Object.values(groups)
}

export default function ProjectDonationList({
  projectId,
  projectName,
  locale = 'en',
}: ProjectDonationListProps) {
  const t = useTranslations('projectDonationList')
  const [donations, setDonations] = useState<ProjectDonation[]>([])
  const [loading, setLoading] = useState(false)
  const [viewResultDonationId, setViewResultDonationId] = useState<string | null>(null)

  // Fetch donations when projectId changes
  useEffect(() => {
    if (projectId === null) {
      setDonations([])
      return
    }

    const controller = new AbortController()
    const fetchDonations = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/donations/project-public/${projectId}`, {
          signal: controller.signal,
        })
        if (response.ok) {
          const data = await response.json()
          setDonations(data)
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return
        clientLogger.error('API', 'Error fetching project donations', {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchDonations()
    return () => controller.abort()
  }, [projectId])

  // No project selected
  if (projectId === null) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-md">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-1/4 rounded bg-gray-200"></div>
          <div className="space-y-3">
            <div className="h-4 rounded bg-gray-200"></div>
            <div className="h-4 rounded bg-gray-200"></div>
            <div className="h-4 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!donations || donations.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 font-display text-2xl font-bold">{t('title')}</h2>
        <p className="py-8 text-center text-gray-500">{t('noDonations')}</p>
      </div>
    )
  }

  const donationGroups = groupDonationsByOrder(donations)

  return (
    <div className="rounded-lg bg-white p-4 shadow-md md:p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-gray-900 md:mb-6 md:text-2xl">
        {t('title')}
      </h2>

      <DonationTableDesktop
        donationGroups={donationGroups}
        locale={locale}
        onViewResult={setViewResultDonationId}
      />

      <DonationCardMobile
        donationGroups={donationGroups}
        locale={locale}
        onViewResult={setViewResultDonationId}
      />

      {donations.length > 0 && (
        <div className="mt-4 text-center text-sm font-medium text-gray-600">
          {t('totalDonations', { count: donations.length })}
        </div>
      )}

      {/* Result Viewer Modal */}
      {viewResultDonationId && (
        <DonationResultViewer
          donationPublicId={viewResultDonationId}
          onClose={() => setViewResultDonationId(null)}
        />
      )}
    </div>
  )
}
