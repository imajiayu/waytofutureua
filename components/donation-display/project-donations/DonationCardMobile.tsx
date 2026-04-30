'use client'

import { useTranslations } from 'next-intl'

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

export default function DonationCardMobile({ donationGroups, locale, onViewResult }: Props) {
  const t = useTranslations('projectDonationList')

  return (
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
                      {formatDate(donation.donated_at, locale as AppLocale)}
                    </div>
                  </div>
                  <div>
                    <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                      {t('columns.updatedAt')}
                    </div>
                    <div className="text-xs leading-tight text-gray-900">
                      {formatDate(donation.updated_at, locale as AppLocale)}
                    </div>
                  </div>
                </div>

                {/* Action Button (compact) */}
                {canViewResult(donation.donation_status) && (
                  <button
                    className="mt-1.5 w-full rounded bg-ukraine-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-ukraine-blue-600"
                    onClick={() => onViewResult(donation.donation_public_id)}
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
  )
}
