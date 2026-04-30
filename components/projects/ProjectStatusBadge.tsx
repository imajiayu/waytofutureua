'use client'

import { useTranslations } from 'next-intl'

import Badge, { type BadgeColor } from '@/components/ui/Badge'
import type { ProjectStatus } from '@/types'

interface Props {
  status: ProjectStatus | string | null
}

const PROJECT_STATUS_COLORS: Record<ProjectStatus, BadgeColor> = {
  planned: {
    bg: 'bg-ukraine-gold-100',
    text: 'text-ukraine-gold-800',
    border: 'border-ukraine-gold-200',
  },
  active: { bg: 'bg-life-100', text: 'text-life-800', border: 'border-life-200' },
  completed: {
    bg: 'bg-ukraine-blue-100',
    text: 'text-ukraine-blue-800',
    border: 'border-ukraine-blue-200',
  },
  paused: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
}

const VALID_PROJECT_STATUSES: readonly ProjectStatus[] = [
  'planned',
  'active',
  'completed',
  'paused',
] as const

const isProjectStatus = (status: unknown): status is ProjectStatus =>
  typeof status === 'string' && (VALID_PROJECT_STATUSES as readonly string[]).includes(status)

/**
 * Project Status Badge Component
 *
 * Backed by the shared `<Badge>` primitive in `components/ui/`.
 */
export default function ProjectStatusBadge({ status }: Props) {
  const t = useTranslations('projects')
  const validStatus = isProjectStatus(status) ? status : 'active'
  return (
    <Badge color={PROJECT_STATUS_COLORS[validStatus]} bordered>
      {t(`status.${validStatus}`)}
    </Badge>
  )
}
