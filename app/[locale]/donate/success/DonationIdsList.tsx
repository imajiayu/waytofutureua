'use client'

import CopyButton from '@/components/common/CopyButton'
import { getTranslatedText } from '@/lib/i18n-utils'
import type { AppLocale, I18nText } from '@/types'

type Donation = {
  id: number
  donation_public_id: string
  amount: number
  projects: {
    project_name_i18n: I18nText | null
    location_i18n: I18nText | null
    unit_name_i18n: I18nText | null
    aggregate_donations: boolean | null
  }
}

type DonationIdsListProps = {
  donations: Donation[]
  locale: string
  t: (key: string) => string
}

export default function DonationIdsList({ donations, locale, t }: DonationIdsListProps) {
  return (
    <div className="rounded-lg border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="mb-2 inline-block rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {t('important')}
            </div>
            <h3 className="mb-1 font-display text-lg font-bold text-gray-900">
              {t('saveIdsTitle')}
            </h3>
            <p className="text-sm text-gray-700">{t('saveIdsDescription')}</p>
          </div>
        </div>
        {donations.length > 1 && (
          <div className="w-full flex-shrink-0 sm:w-auto">
            <CopyButton
              text={donations.map((d) => d.donation_public_id).join(' ')}
              label={t('copy.copyAll')}
              copiedLabel={t('copy.copied')}
              variant="secondary"
              className="w-full !border-ukraine-blue-500 !bg-ukraine-blue-500 !text-white hover:!bg-ukraine-blue-600 sm:w-auto"
            />
          </div>
        )}
      </div>
      <div className="space-y-2">
        {donations.map((donation, index) => {
          const donationProjectName = getTranslatedText(
            donation.projects.project_name_i18n,
            locale as AppLocale
          )
          const donationLocation = getTranslatedText(
            donation.projects.location_i18n,
            locale as AppLocale
          )
          const unitName = getTranslatedText(donation.projects.unit_name_i18n, locale as AppLocale)
          const isAggregateProject = donation.projects.aggregate_donations === true

          return (
            <div
              key={donation.id}
              className="rounded-lg border border-amber-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    {index + 1}
                  </span>
                  <code className="break-all font-data text-sm text-gray-900">
                    {donation.donation_public_id}
                  </code>
                </div>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  {!isAggregateProject && (
                    <span className="text-sm text-gray-600">1 {unitName}</span>
                  )}
                  <span className="text-base font-bold text-life-600">
                    ${Number(donation.amount).toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3 pl-7 sm:flex-nowrap sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-base font-semibold text-gray-800">
                    {donationProjectName}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600">{donationLocation}</p>
                </div>
                <div className="flex-shrink-0">
                  <CopyButton
                    text={donation.donation_public_id}
                    label={t('copy.copyId')}
                    copiedLabel={t('copy.copied')}
                    variant="secondary"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
