'use client'

import { useTranslations } from 'next-intl'

import Badge from '@/components/ui/Badge'
import { type DonationStatus, STATUS_COLORS } from '@/lib/donation-status'

interface Props {
  status: DonationStatus
}

const FALLBACK_COLOR = { bg: 'bg-gray-100', text: 'text-gray-700' }

/**
 * Donation Status Badge Component
 *
 * Displays a color-coded badge for donation status with user-friendly translations.
 * Backed by the shared `<Badge>` primitive in `components/ui/`.
 */
export default function DonationStatusBadge({ status }: Props) {
  const t = useTranslations('common')
  return (
    <Badge color={STATUS_COLORS[status] || FALLBACK_COLOR}>{t(`donationStatus.${status}`)}</Badge>
  )
}
