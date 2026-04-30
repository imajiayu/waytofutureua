'use client'

import { useTranslations } from 'next-intl'

/**
 * Long-term Project Badge Component
 *
 * Displays a badge indicating a project is long-term/ongoing.
 * Style aligned with ProjectStatusBadge for visual consistency.
 */
export default function LongTermBadge() {
  const t = useTranslations('projects')

  return (
    <span className="inline-flex items-center rounded-full border border-ukraine-blue-200 bg-ukraine-blue-100 px-2.5 py-0.5 text-xs font-medium text-ukraine-blue-800">
      {t('longTerm')}
    </span>
  )
}
