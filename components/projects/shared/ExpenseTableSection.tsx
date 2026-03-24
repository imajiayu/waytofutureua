'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PackageIcon, FileTextIcon, DollarSignIcon, ReceiptIcon } from '@/components/icons'
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
}: ExpenseTableSectionProps) {
  const t = useTranslations('projects')

  return (
    <article className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-christmas-pine via-emerald-700 to-teal-700 p-4 overflow-hidden">
        <TwinklingStars count={4} />
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <PackageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg md:text-xl font-bold text-white">{title}</h2>
            <p className="text-xs text-white/80">{description}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Table */}
        <section>
          <div className="flex items-center gap-1.5 mb-2">
            <FileTextIcon className="w-4 h-4 text-christmas-pine" />
            <h3 className="font-display text-sm font-bold text-gray-900">{tableTitle}</h3>
          </div>

          <div className="rounded-xl overflow-hidden border border-gray-200">
            {/* Table header */}
            <div className="bg-gradient-to-r from-christmas-pine/10 to-emerald-50 px-3 py-2 grid grid-cols-12 gap-2 font-semibold text-xs text-gray-700 border-b border-gray-200">
              <div className="col-span-5 md:col-span-6">{t('item')}</div>
              <div className="col-span-3 md:col-span-2 text-center">{t('quantity')}</div>
              <div className="col-span-4 text-right">{t('unitPrice')}</div>
            </div>

            {/* Table body (project-specific rows) */}
            {children}

            {/* Total row */}
            {total && (
              <div className="bg-gradient-to-r from-christmas-pine to-emerald-600 px-3 py-3 grid grid-cols-12 gap-2 items-center text-white">
                <div className="col-span-5 md:col-span-6 font-display font-bold">{t('total')}</div>
                <div className="col-span-3 md:col-span-2 text-center">
                  <span className="inline-block px-2 py-0.5 bg-white/20 rounded-full font-bold text-xs">
                    {total.items} {t('items')}
                  </span>
                </div>
                <div className="col-span-4 text-right">
                  <div className="font-display font-bold text-lg">
                    ₴{total.totalCost.uah.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/80">(${total.totalCost.usd})</div>
                </div>
              </div>
            )}
          </div>

          {exchangeRateNote && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500">
              <DollarSignIcon className="w-3 h-3" />
              <span className="italic">{exchangeRateNote}</span>
            </div>
          )}

          {note && (
            <div className="mt-2 text-xs text-gray-600 italic">{note}</div>
          )}
        </section>

        {/* Receipts */}
        {receipts && receipts.images && receipts.images.length > 0 && (
          <section className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <ReceiptIcon className="w-4 h-4 text-christmas-pine" />
              <h3 className="font-display text-sm font-bold text-gray-900">
                {receiptsTitle || t('project3.expenseReceipts')}
              </h3>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5">
              {receipts.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => onReceiptClick?.(idx)}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-sm border border-gray-100 group cursor-pointer hover:border-christmas-gold/50 transition-all"
                >
                  <Image
                    src={img}
                    alt={receiptImageAlt ? receiptImageAlt(idx + 1) : t('receiptImageAlt', { index: idx + 1 })}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 25vw, 14vw"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[8px] text-white font-medium">
                    #{idx + 1}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Empty receipts placeholder */}
        {receipts && (!receipts.images || receipts.images.length === 0) && receipts.description && (
          <section className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <ReceiptIcon className="w-4 h-4 text-christmas-pine" />
              <h3 className="font-display text-sm font-bold text-gray-900">
                {receiptsTitle || t('project3.expenseReceipts')}
              </h3>
            </div>
            <p className="text-xs text-gray-400 italic">{receipts.description}</p>
          </section>
        )}
      </div>
    </article>
  )
}
