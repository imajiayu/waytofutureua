'use client'

import { useTranslations } from 'next-intl'

import { MapPinIcon } from '@/components/icons'

interface Props {
  projectName: string
  location: string
  unitName: string
  unitPrice: number
  isAggregatedProject: boolean
}

export default function ProjectSummaryHeader({
  projectName,
  location,
  unitName,
  unitPrice,
  isAggregatedProject,
}: Props) {
  const t = useTranslations('donate')

  return (
    <div className="border-b border-gray-200 bg-ukraine-blue-50 p-6">
      <h3 className="mb-3 line-clamp-2 font-display text-lg font-bold text-gray-900">
        {projectName}
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPinIcon className="h-4 w-4 flex-shrink-0" />
          <span>{location}</span>
        </div>
        {!isAggregatedProject && (
          <div className="flex items-baseline gap-2">
            <span className="font-data text-2xl font-bold text-ukraine-blue-500">
              ${unitPrice.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500">{t('quantity.perUnit', { unitName })}</span>
          </div>
        )}
      </div>
    </div>
  )
}
