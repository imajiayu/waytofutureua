'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { canViewResult } from '@/lib/donation-status'
import { formatDate } from '@/lib/i18n-utils'
import type { AppLocale } from '@/types'

import DonationStatusBadge from '../DonationStatusBadge'
import type { ProjectDonation } from './types'

interface Props {
  donationGroups: ProjectDonation[][]
  locale: string
  onViewResult: (donationPublicId: string) => void
}

export default function DonationTableDesktop({ donationGroups, locale, onViewResult }: Props) {
  const t = useTranslations('projectDonationList')

  return (
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
            <th className="px-4 py-3 text-left font-semibold text-gray-900">{t('columns.time')}</th>
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
                    {formatDate(donation.donated_at, locale as AppLocale)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {formatDate(donation.updated_at, locale as AppLocale)}
                  </td>
                  <td className="px-4 py-4">
                    <DonationStatusBadge status={donation.donation_status} />
                  </td>
                  <td className="px-4 py-4">
                    {canViewResult(donation.donation_status) && (
                      <button
                        className="text-sm font-medium text-ukraine-blue-500 hover:text-ukraine-blue-600 hover:underline"
                        onClick={() => onViewResult(donation.donation_public_id)}
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
  )
}
