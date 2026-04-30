'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { DollarSignIcon, FileTextIcon, PackageIcon, ReceiptIcon } from '@/components/icons'
import TwinklingStars from '@/components/projects/shared/TwinklingStars'

interface TotalData {
  items: number
  totalCost: { uah: number; usd: number }
}

interface ReceiptsData {
  description?: string
  images?: string[]
}

interface ExpenseTableSectionProps {
  title: string
  description: string
  tableTitle: string
  children: React.ReactNode
  total?: TotalData
  exchangeRateNote?: string
  note?: string
  receipts?: ReceiptsData
  receiptsTitle?: string
  receiptImageAlt?: (index: number) => string
  onReceiptClick?: (index: number) => void
  collapsible?: boolean
  expandHint?: string
  afterContent?: React.ReactNode
}

export default function ExpenseTableSection({
  title,
  description,
  tableTitle,
  children,
  total,
  exchangeRateNote,
  note,
  receipts,
  receiptsTitle,
  receiptImageAlt,
  onReceiptClick,
  collapsible,
  expandHint,
  afterContent,
}: ExpenseTableSectionProps) {
  const t = useTranslations('projects')
  const [isExpanded, setIsExpanded] = useState(!collapsible)

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:rounded-3xl">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-christmas-pine via-emerald-700 to-teal-700 p-4">
        <TwinklingStars count={4} />
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
            <PackageIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white md:text-xl">{title}</h2>
            <p className="text-xs text-white/80">{description}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Table */}
        <section>
          {collapsible ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="group mb-2 flex w-full items-center gap-1.5 text-left"
            >
              <FileTextIcon className="h-4 w-4 flex-shrink-0 text-christmas-pine" />
              <h3 className="font-display text-sm font-bold text-gray-900">{tableTitle}</h3>
              <div className="flex-1" />
              {!isExpanded && expandHint && (
                <span className="hidden text-right text-xs leading-tight text-gray-400 transition-colors group-hover:text-gray-500 sm:inline">
                  {expandHint}
                </span>
              )}
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-200">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`h-3.5 w-3.5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </div>
            </button>
          ) : (
            <div className="mb-2 flex items-center gap-1.5">
              <FileTextIcon className="h-4 w-4 text-christmas-pine" />
              <h3 className="font-display text-sm font-bold text-gray-900">{tableTitle}</h3>
            </div>
          )}

          <div
            className={
              collapsible
                ? `overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`
                : undefined
            }
          >
            <div className="overflow-hidden rounded-xl border border-gray-200">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 border-b border-gray-200 bg-gradient-to-r from-christmas-pine/10 to-emerald-50 px-3 py-2 text-xs font-semibold text-gray-700">
                <div className="col-span-5 md:col-span-6">{t('item')}</div>
                <div className="col-span-3 text-center md:col-span-2">{t('quantity')}</div>
                <div className="col-span-4 text-right">{t('unitPrice')}</div>
              </div>

              {/* Table body (project-specific rows) */}
              {children}

              {/* Total row */}
              {total && (
                <div className="grid grid-cols-12 items-center gap-2 bg-gradient-to-r from-christmas-pine to-emerald-600 px-3 py-3 text-white">
                  <div className="col-span-5 font-display font-bold md:col-span-6">
                    {t('total')}
                  </div>
                  <div className="col-span-3 text-center md:col-span-2">
                    <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                      {total.items} {t('items')}
                    </span>
                  </div>
                  <div className="col-span-4 text-right">
                    <div className="font-display text-lg font-bold">
                      ₴{total.totalCost.uah.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/80">(${total.totalCost.usd})</div>
                  </div>
                </div>
              )}
            </div>

            {exchangeRateNote && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500">
                <DollarSignIcon className="h-3 w-3" />
                <span className="italic">{exchangeRateNote}</span>
              </div>
            )}

            {note && <div className="mt-2 text-xs italic text-gray-600">{note}</div>}

            {/* Receipts */}
            {receipts && receipts.images && receipts.images.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <ReceiptIcon className="h-4 w-4 text-christmas-pine" />
                  <h3 className="font-display text-sm font-bold text-gray-900">
                    {receiptsTitle || t('project3.expenseReceipts')}
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-1.5 md:grid-cols-7">
                  {receipts.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => onReceiptClick?.(idx)}
                      className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border border-gray-100 shadow-sm transition-all hover:border-christmas-gold/50"
                    >
                      <Image
                        src={img}
                        alt={
                          receiptImageAlt
                            ? receiptImageAlt(idx + 1)
                            : t('receiptImageAlt', { index: idx + 1 })
                        }
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 25vw, 14vw"
                      />
                      <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-medium text-white backdrop-blur-sm">
                        #{idx + 1}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty receipts placeholder */}
            {receipts &&
              (!receipts.images || receipts.images.length === 0) &&
              receipts.description && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="mb-2 flex items-center gap-1.5">
                    <ReceiptIcon className="h-4 w-4 text-christmas-pine" />
                    <h3 className="font-display text-sm font-bold text-gray-900">
                      {receiptsTitle || t('project3.expenseReceipts')}
                    </h3>
                  </div>
                  <p className="text-xs italic text-gray-400">{receipts.description}</p>
                </div>
              )}
          </div>
        </section>

        {afterContent}
      </div>
    </article>
  )
}
