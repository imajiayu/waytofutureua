'use client'

import { useTranslations } from 'next-intl'
import React, { useEffect, useState } from 'react'

import { canViewResult, type DonationStatus } from '@/lib/donation-status'
import { formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import { clientLogger } from '@/lib/logger-client'

import DonationResultViewer from './DonationResultViewer'
import DonationStatusBadge from './DonationStatusBadge'

type Donation = {
  id: number
  donation_public_id: string
  donor_email_obfuscated: string | null
  order_id: string // MD5 hash for grouping donations from same payment
  amount: number
  currency: string
  donation_status: DonationStatus
  donated_at: string
  updated_at: string
}

interface ProjectDonationListProps {
  projectId: number | null
  projectName: string
  locale?: string
}

export default function ProjectDonationList({
  projectId,
  projectName,
  locale = 'en',
}: ProjectDonationListProps) {
  const t = useTranslations('projectDonationList')
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(false)
  const [viewResultDonationId, setViewResultDonationId] = useState<string | null>(null)

  // Helper function to group donations by order_id
  const groupDonationsByOrder = (donations: Donation[]): Donation[][] => {
    const groups: { [key: string]: Donation[] } = {}

    donations.forEach((donation) => {
      const orderId = donation.order_id
      if (!groups[orderId]) {
        groups[orderId] = []
      }
      groups[orderId].push(donation)
    })

    return Object.values(groups)
  }

  // Get grouped donations
  const donationGroups = groupDonationsByOrder(donations)

  // Fetch donations when projectId changes
  useEffect(() => {
    if (projectId === null) {
      setDonations([])
      return
    }

    const fetchDonations = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/donations/project-public/${projectId}`)
        if (response.ok) {
          const data = await response.json()
          setDonations(data)
        }
      } catch (error) {
        clientLogger.error('API', 'Error fetching project donations', {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDonations()
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

  // Donations table
  return (
    <div className="rounded-lg bg-white p-4 shadow-md md:p-6">
      <h2 className="mb-4 font-display text-xl font-bold text-gray-900 md:mb-6 md:text-2xl">
        {t('title')}
      </h2>

      {/* Desktop Table View - Hidden on Mobile */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                {t('columns.email')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                {t('columns.donationId')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                {t('columns.amount')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                {t('columns.time')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                {t('columns.updatedAt')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                {t('columns.status')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900">
                {t('columns.action')}
              </th>
            </tr>
          </thead>
          <tbody>
            {donationGroups.map((group, groupIndex) => (
              <React.Fragment key={`group-${groupIndex}`}>
                {/* Group wrapper - only show border if group has multiple donations */}
                {group.map((donation, donationIndex) => (
                  <tr
                    key={donation.id}
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${group.length > 1 ? 'border-l-4 border-l-blue-500' : ''} ${group.length > 1 && donationIndex === 0 ? 'border-t-2 border-t-blue-500' : ''} ${group.length > 1 && donationIndex === group.length - 1 ? 'border-b-2 border-b-blue-500' : ''} `}
                  >
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {donation.donor_email_obfuscated || 'N/A'}
                    </td>
                    <td className="px-4 py-4">
                      <code className="rounded border border-ukraine-blue-200 bg-ukraine-blue-50 px-2 py-1 font-data text-sm text-ukraine-blue-900">
                        {donation.donation_public_id}
                      </code>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {donation.currency} {donation.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(donation.donated_at, locale as SupportedLocale)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(donation.updated_at, locale as SupportedLocale)}
                    </td>
                    <td className="px-4 py-4">
                      <DonationStatusBadge status={donation.donation_status} />
                    </td>
                    <td className="px-4 py-4">
                      {canViewResult(donation.donation_status) && (
                        <button
                          className="text-sm font-medium text-ukraine-blue-500 hover:text-ukraine-blue-600 hover:underline"
                          onClick={() => setViewResultDonationId(donation.donation_public_id)}
                        >
                          {t('actions.viewResult')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Visible only on Mobile */}
      <div className="space-y-2 md:hidden">
        {donationGroups.map((group, groupIndex) => (
          <div
            key={`mobile-group-${groupIndex}`}
            className={` ${group.length > 1 ? 'rounded-r-lg border-l-4 border-ukraine-blue-500 bg-ukraine-blue-50/20' : ''} `}
          >
            {/* Compact group indicator */}
            {group.length > 1 && (
              <div className="px-2 pb-1 pt-1.5">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ukraine-blue-500">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  <span>{t('groupIndicator', { count: group.length })}</span>
                </div>
              </div>
            )}

            <div className={`${group.length > 1 ? 'space-y-1.5' : 'space-y-2'}`}>
              {group.map((donation) => (
                <div
                  key={donation.id}
                  className="rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm"
                >
                  {/* Row 1: Donation ID (full width) */}
                  <div className="mb-2">
                    <code className="rounded bg-ukraine-blue-500 px-2 py-1 font-data text-xs font-semibold text-white">
                      {donation.donation_public_id}
                    </code>
                  </div>

                  {/* Row 2: Amount + Status */}
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-base font-bold text-gray-900">
                      {donation.currency} {donation.amount.toFixed(2)}
                    </div>
                    <div className="origin-right scale-90">
                      <DonationStatusBadge status={donation.donation_status} />
                    </div>
                  </div>

                  {/* Row 3: Email (compact) */}
                  <div className="mb-1.5 flex items-baseline gap-1.5">
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      {t('emailLabel')}
                    </span>
                    <span className="break-all text-xs font-medium leading-tight text-gray-900">
                      {donation.donor_email_obfuscated || 'N/A'}
                    </span>
                  </div>

                  {/* Row 4: Time + Updated At (two columns) */}
                  <div className="mb-1.5 grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        {t('columns.time')}
                      </div>
                      <div className="text-xs leading-tight text-gray-900">
                        {formatDate(donation.donated_at, locale as SupportedLocale)}
                      </div>
                    </div>
                    <div>
                      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        {t('columns.updatedAt')}
                      </div>
                      <div className="text-xs leading-tight text-gray-900">
                        {formatDate(donation.updated_at, locale as SupportedLocale)}
                      </div>
                    </div>
                  </div>

                  {/* Action Button (compact) */}
                  {canViewResult(donation.donation_status) && (
                    <button
                      className="mt-1.5 w-full rounded bg-ukraine-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ukraine-blue-600"
                      onClick={() => setViewResultDonationId(donation.donation_public_id)}
                    >
                      {t('actions.viewResult')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

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
