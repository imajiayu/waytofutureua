'use client'

import { useTranslations } from 'next-intl'

import Badge from '@/components/ui/Badge'

const LONG_TERM_COLOR = {
  bg: 'bg-ukraine-blue-100',
  text: 'text-ukraine-blue-800',
  border: 'border-ukraine-blue-200',
}

/**
 * Long-term Project Badge Component
 *
 * Backed by the shared `<Badge>` primitive in `components/ui/`.
 */
export default function LongTermBadge() {
  const t = useTranslations('projects')
  return (
    <Badge color={LONG_TERM_COLOR} bordered>
      {t('longTerm')}
    </Badge>
  )
}
