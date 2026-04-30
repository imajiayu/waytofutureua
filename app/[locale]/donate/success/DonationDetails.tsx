'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { type DonationStatus, getStatusGroup, type StatusGroup } from '@/lib/donation-status'
import { clientLogger } from '@/lib/logger-client'
import type { I18nText } from '@/types'

import DonationIdsList from './DonationIdsList'
import EmptyState from './EmptyState'
import InfoCard from './InfoCard'
import LoadingState from './LoadingState'
import PageHeader from './PageHeader'
import StatusBanner from './StatusBanner'

type Donation = {
  id: number
  donation_public_id: string
  amount: number
  donor_email: string
  donation_status: DonationStatus
  projects: {
    id: number
    project_name: string
    project_name_i18n: I18nText | null
    location: string
    location_i18n: I18nText | null
    unit_name: string
    unit_name_i18n: I18nText | null
    aggregate_donations: boolean | null
  }
}

type Props = {
  orderReference: string
  locale: string
}

export default function DonationDetails({ orderReference, locale }: Props) {
  const t = useTranslations('donateSuccess')
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchDonations = async () => {
      try {
        const response = await fetch(`/api/donations/order/${orderReference}`)

        if (response.ok && isMounted) {
          const data = await response.json()

          if (data.donations && data.donations.length > 0) {
            setDonations(data.donations)
          }
        }
      } catch (error) {
        clientLogger.error('API', 'Error fetching order donations', {
          orderReference,
          error: error instanceof Error ? error.message : String(error),
        })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDonations()

    return () => {
      isMounted = false
    }
  }, [orderReference])

  if (loading) {
    return <LoadingState title={t('title')} subtitle={t('thankYou')} message={t('loading')} />
  }

  if (donations.length === 0) {
    return (
      <EmptyState
        title={t('title')}
        subtitle={t('thankYou')}
        message={t('processing')}
        description={t('processingDescription')}
      />
    )
  }

  // Determine status group (all donations in same group)
  const statusGroup = getStatusGroup(donations[0].donation_status)
  const totalAmount = donations.reduce((sum, d) => sum + Number(d.amount), 0)
  const donorEmail = donations[0].donor_email

  // Status-specific rendering
  if (statusGroup === 'failed') {
    return (
      <>
        <PageHeader
          title={t('status.failed.pageTitle')}
          subtitle={t('status.failed.pageSubtitle')}
          titleColor="text-red-600"
        />

        <div className="space-y-4">
          <StatusBanner
            type="failed"
            title={t('status.failed.title')}
            description={t('status.failed.description')}
            amount={totalAmount}
            amountLabel={t('status.failed.amount')}
          />

          <DonationIdsList donations={donations} locale={locale} t={t} />

          <InfoCard
            variant="blue"
            title={t('status.failed.helpTitle')}
            description={t('status.failed.helpText')}
          />
        </div>
      </>
    )
  }

  if (statusGroup === 'processing') {
    const emailIcon = (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
    )

    return (
      <>
        <PageHeader
          title={t('status.processing.pageTitle')}
          subtitle={t('status.processing.pageSubtitle')}
        />

        <div className="space-y-4">
          <StatusBanner
            type="processing"
            title={t('status.processing.title')}
            description={t('status.processing.description')}
            amount={totalAmount}
            amountLabel={t('status.processing.amount')}
          />

          <InfoCard
            variant="blue"
            title={t('emailReminderTitle')}
            description={t('emailReminderDescription', { email: donorEmail })}
            icon={emailIcon}
          />

          <DonationIdsList donations={donations} locale={locale} t={t} />
        </div>
      </>
    )
  }

  // Success group
  const emailIcon = (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  )

  return (
    <>
      <PageHeader
        title={t('status.success.pageTitle')}
        subtitle={t('status.success.pageSubtitle')}
        titleColor="text-green-600"
      />

      <div className="space-y-4">
        <StatusBanner
          type="success"
          title={t('status.success.title')}
          description={t('status.success.description')}
          amount={totalAmount}
          amountLabel={t('status.success.amount')}
        />

        <InfoCard
          variant="blue"
          title={t('status.success.emailSent')}
          description={t('status.success.emailSentDescription', { email: donorEmail })}
          icon={emailIcon}
        />

        <DonationIdsList donations={donations} locale={locale} t={t} />

        <InfoCard
          variant="purple"
          title={t('status.success.nextSteps')}
          description={t('status.success.trackInfo')}
        />
      </div>
    </>
  )
}
