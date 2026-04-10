'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CalendarIcon, MapPinIcon, ChevronDownIcon, ImageIcon, ReceiptIcon } from '@/components/icons'
import { useTranslations } from 'next-intl'
import { formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import { formatCurrency } from '@/lib/utils'
import { SectionHeader } from '@/components/projects/shared'
import type { EventsContent } from '../types'

interface EventsSectionProps {
  events: EventsContent
  locale: string
  onImageClick: (eventIndex: number, imageIndex: number) => void
  onReceiptClick: (eventIndex: number, receiptIndex: number) => void
}

export default function EventsSection({ events, locale, onImageClick, onReceiptClick }: EventsSectionProps) {
  const t = useTranslations('projects.project5')
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set())

  const toggleEvent = (idx: number) => {
    setExpandedEvents(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <section className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden p-5 md:p-8">
      <SectionHeader title={events.title} gradientClassName="from-cyan-400 to-teal-500" className="mb-5" />

      {/* Events List */}
      <div className="space-y-3">
        {events.list.map((event, eventIdx) => {
          const isExpanded = expandedEvents.has(eventIdx)
          const photoCount = event.images.length
          const receiptCount = event.receipts?.length ?? 0

          return (
            <div
              key={eventIdx}
              className={`rounded-xl border overflow-hidden transition-colors duration-300 ${isExpanded ? 'border-teal-200 bg-teal-50/20' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {/* Clickable Header */}
              <button
                type="button"
                onClick={() => toggleEvent(eventIdx)}
                className="w-full flex items-center gap-3 p-3 md:p-4 text-left transition-colors group cursor-pointer"
              >
                {/* Thumbnail preview */}
                {event.images[0] && (
                  <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-black/5">
                    <Image
                      src={event.images[0]}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                )}

                {/* Event info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <div className="flex items-center gap-1.5 text-gray-800">
                      <CalendarIcon className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                      <span className="text-sm font-semibold">
                        {formatDate(event.date, locale as SupportedLocale)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="text-sm truncate">{event.location}</span>
                    </div>
                  </div>
                  {/* Summary badges */}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <ImageIcon className="w-3 h-3" />
                      {photoCount}
                    </span>
                    {receiptCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <ReceiptIcon className="w-3 h-3" />
                        {receiptCount}
                      </span>
                    )}
                    {event.expenses && event.expenses.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        {formatCurrency(
                          event.expenses.reduce((sum, e) => sum + e.amount, 0),
                          event.expenses[0].currency
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chevron */}
                <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0">
                  <ChevronDownIcon
                    className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Collapsible Content */}
              <div
                className="grid"
                style={{
                  gridTemplateRows: isExpanded ? '1fr' : '0fr',
                  transition: 'grid-template-rows 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div className="overflow-hidden">
                  <div className="px-3 pb-3 md:px-4 md:pb-4">
                    {/* Photo Grid */}
                    {event.images.length > 0 && (() => {
                      const useUniformGrid = event.images.length > 0 && (event.images.length - 5) % 4 === 1 && event.images.length !== 5

                      if (useUniformGrid) {
                        return (
                          <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                            {event.images.map((img, imgIdx) => (
                              <div
                                key={imgIdx}
                                role="button"
                                tabIndex={isExpanded ? 0 : -1}
                                className="relative aspect-[4/3] rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
                                onClick={() => onImageClick(eventIdx, imgIdx)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(eventIdx, imgIdx) } }}
                              >
                                <Image
                                  src={img}
                                  alt=""
                                  fill
                                  sizes="(max-width: 768px) 33vw, 25vw"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </div>
                            ))}
                          </div>
                        )
                      }

                      return (
                        <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                          <div
                            role="button"
                            tabIndex={isExpanded ? 0 : -1}
                            className="col-span-2 row-span-2 relative aspect-[3/2] rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
                            onClick={() => onImageClick(eventIdx, 0)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(eventIdx, 0) } }}
                          >
                            <Image
                              src={event.images[0]}
                              alt=""
                              fill
                              sizes="(max-width: 768px) 50vw, 40vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>

                          {event.images.slice(1).map((img, imgIdx) => (
                            <div
                              key={imgIdx}
                              role="button"
                              tabIndex={isExpanded ? 0 : -1}
                              className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
                              onClick={() => onImageClick(eventIdx, imgIdx + 1)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onImageClick(eventIdx, imgIdx + 1) } }}
                            >
                              <Image
                                src={img}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 25vw, 20vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    {/* Expenses */}
                    {event.expenses && event.expenses.length > 0 && (
                      <div className="mt-3 p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {t('expenses')}
                        </h4>
                        <div className="space-y-1.5">
                          {event.expenses.map((expense, expIdx) => (
                            <div key={expIdx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{expense.name}</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency(expense.amount, expense.currency)}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-gray-200 pt-1.5 flex items-center justify-between text-sm font-semibold">
                            <span className="text-gray-700">{t('total')}</span>
                            <span className="text-gray-900">
                              {formatCurrency(
                                event.expenses.reduce((sum, e) => sum + e.amount, 0),
                                event.expenses[0].currency
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Receipts */}
                    {event.receipts && event.receipts.length > 0 && (
                      <div className="mt-3 p-3 md:p-4 bg-gray-50 rounded-lg md:rounded-xl">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {t('receipts')}
                        </h4>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {event.receipts.map((img, rcpIdx) => (
                            <div
                              key={rcpIdx}
                              role="button"
                              tabIndex={isExpanded ? 0 : -1}
                              className="relative aspect-[3/4] rounded-md overflow-hidden cursor-pointer group"
                              onClick={() => onReceiptClick(eventIdx, rcpIdx)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onReceiptClick(eventIdx, rcpIdx) } }}
                            >
                              <Image
                                src={img}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 25vw, 16vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
