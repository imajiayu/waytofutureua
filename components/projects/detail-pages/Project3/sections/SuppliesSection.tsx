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
            className="px-3 py-2 grid grid-cols-12 gap-2 items-center hover:bg-christmas-cream/30 transition-colors"
          >
            <div className="col-span-5 md:col-span-6 font-medium text-xs text-gray-800">
              {supply.item}
            </div>
            <div className="col-span-3 md:col-span-2 text-center">
              <span className="inline-block px-2 py-0.5 bg-christmas-pine/10 text-christmas-pine rounded-full font-bold text-[10px]">
                ×{supply.quantity}
              </span>
            </div>
            <div className="col-span-4 text-right">
              <div className="font-bold text-xs text-gray-900 font-data">
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
