'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { SectionHeader } from '@/components/projects/shared'

import type { SectionProps } from '../types'

interface FinancialSectionProps extends Pick<SectionProps, 'content'> {
  onReportClick: (index: number) => void
}

export default function FinancialSection({ content, onReportClick }: FinancialSectionProps) {
  const t = useTranslations('projects')

  if (!content.financialStatus) {
    return null
  }

  return (
    <section>
      <div className="mb-4">
        <SectionHeader
          title={content.financialStatus.title}
          gradientClassName="from-slate-400 to-slate-600"
          className="mb-2"
        />
        <p className="text-sm leading-relaxed text-gray-600 md:text-base">
          {content.financialStatus.description}
        </p>
      </div>

      {/* Compact Financial Table */}
      <div className="mb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="p-2 text-left font-semibold text-gray-600">
                {t('project0.financial.year')}
              </th>
              <th className="p-2 text-center font-semibold text-gray-600">
                {t('project0.financial.staff')}
              </th>
              <th className="p-2 text-right font-semibold text-red-500">
                {t('project0.financial.expenses')}
              </th>
              <th className="p-2 text-right font-semibold text-emerald-500">
                {t('project0.financial.donations')}
              </th>
              <th className="p-2 text-right font-semibold text-ukraine-blue-500">
                {t('project0.financial.government')}
              </th>
              <th className="p-2 text-right font-semibold text-orange-500">
                {t('project0.financial.deficit')}
              </th>
            </tr>
          </thead>
          <tbody>
            {content.financialStatus.yearlyData.map((year, idx) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <span className="font-semibold text-gray-900">{year.year}</span>
                  <span className="ml-1 text-gray-400">({year.period})</span>
                </td>
                <td className="p-2 text-center">
                  <span className="rounded bg-ukraine-gold-100 px-1.5 py-0.5 text-[10px] font-semibold text-ukraine-gold-700">
                    {year.staffCount}
                  </span>
                </td>
                <td className="p-2 text-right font-data font-semibold text-red-500">
                  ₴{(year.expenses / 1000000).toFixed(1)}M
                </td>
                <td className="p-2 text-right font-data font-semibold text-emerald-500">
                  ₴{(year.donations / 1000000).toFixed(1)}M
                </td>
                <td className="p-2 text-right font-data font-semibold text-ukraine-blue-500">
                  {year.governmentCompensation > 0
                    ? `₴${(year.governmentCompensation / 1000000).toFixed(1)}M`
                    : '—'}
                </td>
                <td className="p-2 text-right">
                  <span className="rounded bg-orange-50 px-1.5 py-0.5 font-data font-bold text-orange-600">
                    ₴{(Math.abs(year.deficit) / 1000000).toFixed(1)}M
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Reports - Compact */}
      <div className="mb-4">
        <h3 className="mb-2 font-display text-sm font-bold text-gray-900">
          {t('project0.financial.officialReports')}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {content.financialStatus.yearlyData
            .filter((year) => year.reportImage)
            .map((year, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                className="group relative cursor-pointer overflow-hidden rounded-lg"
                onClick={() => onReportClick(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onReportClick(idx)
                  }
                }}
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={year.reportImage!}
                    alt={`${year.year} Report`}
                    fill
                    sizes="(max-width: 768px) 25vw, 15vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center">
                    <span className="font-display text-xs font-bold text-white">{year.year}</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Expense Breakdown - Compact */}
      <div className="grid grid-cols-3 gap-2">
        {content.financialStatus.breakdown.categories.map((category, idx) => (
          <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-800">{category.name}</span>
              <span className="font-data text-sm font-bold text-ukraine-blue-500">
                {category.percentage}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ukraine-blue-400 to-ukraine-blue-600"
                style={{ width: `${category.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
