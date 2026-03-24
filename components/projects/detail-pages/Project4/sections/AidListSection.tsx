'use client'

import { useTranslations } from 'next-intl'
import ExpenseTableSection from '@/components/projects/shared/ExpenseTableSection'
import type { AidListData, AidItem } from '../types'

interface AidListSectionProps {
  aidData: AidListData
  locale: string
  onReceiptClick?: (index: number) => void
}

// Category config with icons
const categoryIcons: Record<AidItem['category'], JSX.Element> = {
  toys: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
    </svg>
  ),
  books: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  educational: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    </svg>
  ),
  furniture: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  food: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.38a48.474 48.474 0 00-6-.37c-2.032 0-4.034.125-6 .37m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.17c0 .62-.504 1.124-1.125 1.124H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
    </svg>
  ),
}

// Category translation keys
const categoryTranslationKeys: Record<AidItem['category'], string> = {
  toys: 'categoryToys',
  books: 'categoryBooks',
  educational: 'categoryEducational',
  furniture: 'categoryFurniture',
  food: 'categoryFood',
}

export default function AidListSection({ aidData, locale, onReceiptClick }: AidListSectionProps) {
  const t = useTranslations('projects')

  // Group items by category
  const groupedItems = aidData.items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<AidItem['category'], AidItem[]>
  )

  return (
    <ExpenseTableSection
      title={t('project3.suppliesExpenses')}
      description={t('project3.suppliesExpensesDesc')}
      tableTitle={t('project3.supplyList')}
      total={aidData.total}
      exchangeRateNote={aidData.exchangeRateNote}
      note={aidData.note}
      receipts={aidData.receipts}
      onReceiptClick={onReceiptClick}
    >
      {(Object.entries(groupedItems) as [AidItem['category'], AidItem[]][]).map(([category, items], catIdx) => (
        <div key={category}>
          {/* Category header row */}
          <div className={`flex items-center gap-2 px-3 py-1.5 bg-christmas-pine/5 ${catIdx > 0 ? 'border-t border-gray-100' : ''}`}>
            <div className="w-5 h-5 rounded bg-christmas-pine/15 flex items-center justify-center text-christmas-pine">
              {categoryIcons[category]}
            </div>
            <span className="font-semibold text-xs text-christmas-pine">
              {t(`project4.${categoryTranslationKeys[category]}`)}
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-2 grid grid-cols-12 gap-2 items-center hover:bg-christmas-cream/30 transition-colors"
              >
                <div className="col-span-5 md:col-span-6 font-medium text-xs text-gray-800">
                  {item.item}
                  {item.forChild && (
                    <span className="block text-[10px] text-gray-400 mt-0.5">→ {item.forChild}</span>
                  )}
                </div>
                <div className="col-span-3 md:col-span-2 text-center">
                  <span className="inline-block px-2 py-0.5 bg-christmas-pine/10 text-christmas-pine rounded-full font-bold text-[10px]">
                    ×{item.quantity}
                  </span>
                </div>
                <div className="col-span-4 text-right">
                  {item.unitPrice ? (
                    <>
                      <div className="font-bold text-xs text-gray-900 font-data">
                        ₴{item.unitPrice.uah.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gray-500">(${item.unitPrice.usd})</div>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </ExpenseTableSection>
  )
}
