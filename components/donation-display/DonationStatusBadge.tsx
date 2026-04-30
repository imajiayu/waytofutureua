'use client'

import { useTranslations } from 'next-intl'

import { type DonationStatus, STATUS_COLORS } from '@/lib/donation-status'

interface Props {
  status: DonationStatus
}

/**
 * Donation Status Badge Component
 *
 * Displays a color-coded badge for donation status with user-friendly translations
 *
 * Color Scheme (14 distinct colors):
 * - Pre-payment: Gold (pending), Stone (widget_load_failed)
 * - Processing: Blue (processing), Indigo (fraud_check)
 * - Success: Teal (paid), Emerald (confirmed), Sky (delivering), Deep Green (completed)
 * - Failed: Zinc (expired), Warm Orange (declined), Rose (failed)
 * - Refund: Amber (refunding), Violet (refund_processing), Slate (refunded)
 */
export default function DonationStatusBadge({ status }: Props) {
  const t = useTranslations('common')

  // Get status color classes based on donation status
  const getStatusClasses = (status: DonationStatus): string => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    const colors = STATUS_COLORS[status] || { bg: 'bg-gray-100', text: 'text-gray-700' }
    return `${baseClasses} ${colors.bg} ${colors.text}`
  }

  return <span className={getStatusClasses(status)}>{t(`donationStatus.${status}`)}</span>
}
