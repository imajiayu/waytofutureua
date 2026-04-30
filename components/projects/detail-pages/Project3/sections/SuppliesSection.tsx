'use client'

import { useTranslations } from 'next-intl'

import ExpenseTableSection from '@/components/projects/shared/ExpenseTableSection'

import type { SuppliesSectionProps } from '../types'

export default function SuppliesSection({
  suppliesData,
  locale,
  onReceiptClick,
}: SuppliesSectionProps) {
  const t = useTranslations('projects')

  return (
    <ExpenseTableSection
      title={t('project3.suppliesExpenses')}
      description={t('project3.suppliesExpensesDesc')}
      tableTitle={t('project3.supplyList')}
      total={suppliesData.total}
      exchangeRateNote={suppliesData.exchangeRateNote}
      receipts={suppliesData.receipts}
      onReceiptClick={onReceiptClick}
    >
      <div className="divide-y divide-gray-100">
        {suppliesData.supplies.map((supply, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 items-center gap-2 px-3 py-2 transition-colors hover:bg-christmas-cream/30"
          >
            <div className="col-span-5 text-xs font-medium text-gray-800 md:col-span-6">
              {supply.item}
            </div>
            <div className="col-span-3 text-center md:col-span-2">
              <span className="inline-block rounded-full bg-christmas-pine/10 px-2 py-0.5 text-[10px] font-bold text-christmas-pine">
                ×{supply.quantity}
              </span>
            </div>
            <div className="col-span-4 text-right">
              <div className="font-data text-xs font-bold text-gray-900">
                ₴{supply.unitPrice.uah.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500">(${supply.unitPrice.usd})</div>
            </div>
          </div>
        ))}
      </div>
    </ExpenseTableSection>
  )
}
