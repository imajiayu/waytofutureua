'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import {
  CalendarIcon,
  ChevronDownIcon,
  ImageIcon,
  MapPinIcon,
  ReceiptIcon,
} from '@/components/icons'
import { SectionHeader } from '@/components/projects/shared'
import { formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import { formatCurrency } from '@/lib/utils'

import type { EventsContent } from '../types'

interface EventsSectionProps {
  events: EventsContent
  locale: string
  onImageClick: (eventIndex: number, imageIndex: number) => void
  onReceiptClick: (eventIndex: number, receiptIndex: number) => void
}

export default function EventsSection({
  events,
  locale,
  onImageClick,
  onReceiptClick,
}: EventsSectionProps) {
  const t = useTranslations('projects.project5')
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set())

  const toggleEvent = (idx: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <section className="overflow-hidden rounded-xl bg-white p-5 shadow-sm md:rounded-2xl md:p-8">
      <SectionHeader
        title={events.title}
        gradientClassName="from-cyan-400 to-teal-500"
        className="mb-5"
      />

      {/* Events List */}
      <div className="space-y-3">
        {events.list.map((event, eventIdx) => {
          const isExpanded = expandedEvents.has(eventIdx)
          const photoCount = event.images.length
          const receiptCount = event.receipts?.length ?? 0

          return (
            <div
              key={eventIdx}
              className={`overflow-hidden rounded-xl border transition-colors duration-300 ${isExpanded ? 'border-teal-200 bg-teal-50/20' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {/* Clickable Header */}
              <button
                type="button"
                onClick={() => toggleEvent(eventIdx)}
                className="group flex w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors md:p-4"
              >
                {/* Thumbnail preview */}
                {event.images[0] && (
                  <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg ring-1 ring-black/5 md:h-12 md:w-12">
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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <div className="flex items-center gap-1.5 text-gray-800">
                      <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0 text-teal-600" />
                      <span className="text-sm font-semibold">
                        {formatDate(event.date, locale as SupportedLocale)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate text-sm">{event.location}</span>
                    </div>
                  </div>
                  {/* Summary badges */}
                  <div className="mt-1 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <ImageIcon className="h-3 w-3" />
                      {photoCount}
                    </span>
                    {receiptCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <ReceiptIcon className="h-3 w-3" />
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
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-200">
                  <ChevronDownIcon
                    className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
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
                    {event.images.length > 0 &&
                      (() => {
                        const useUniformGrid =
                          event.images.length > 0 &&
                          (event.images.length - 5) % 4 === 1 &&
                          event.images.length !== 5

                        if (useUniformGrid) {
                          return (
                            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                              {event.images.map((img, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  role="button"
                                  tabIndex={isExpanded ? 0 : -1}
                                  className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-lg md:rounded-xl"
                                  onClick={() => onImageClick(eventIdx, imgIdx)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      onImageClick(eventIdx, imgIdx)
                                    }
                                  }}
                                >
                                  <Image
                                    src={img}
                                    alt=""
                                    fill
                                    sizes="(max-width: 768px) 33vw, 25vw"
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
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
                              className="group relative col-span-2 row-span-2 aspect-[3/2] cursor-pointer overflow-hidden rounded-lg md:rounded-xl"
                              onClick={() => onImageClick(eventIdx, 0)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  onImageClick(eventIdx, 0)
                                }
                              }}
                            >
                              <Image
                                src={event.images[0]}
                                alt=""
                                fill
                                sizes="(max-width: 768px) 50vw, 40vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                            </div>

                            {event.images.slice(1).map((img, imgIdx) => (
                              <div
                                key={imgIdx}
                                role="button"
                                tabIndex={isExpanded ? 0 : -1}
                                className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg md:rounded-xl"
                                onClick={() => onImageClick(eventIdx, imgIdx + 1)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    onImageClick(eventIdx, imgIdx + 1)
                                  }
                                }}
                              >
                                <Image
                                  src={img}
                                  alt=""
                                  fill
                                  sizes="(max-width: 768px) 25vw, 20vw"
                                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                              </div>
                            ))}
                          </div>
                        )
                      })()}

                    {/* Expenses */}
                    {event.expenses && event.expenses.length > 0 && (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 md:rounded-xl md:p-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
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
                          <div className="flex items-center justify-between border-t border-gray-200 pt-1.5 text-sm font-semibold">
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
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 md:rounded-xl md:p-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {t('receipts')}
                        </h4>
                        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                          {event.receipts.map((img, rcpIdx) => (
                            <div
                              key={rcpIdx}
                              role="button"
                              tabIndex={isExpanded ? 0 : -1}
                              className="group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-md"
                              onClick={() => onReceiptClick(eventIdx, rcpIdx)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  onReceiptClick(eventIdx, rcpIdx)
                                }
                              }}
                            >
                              <Image
                                src={img}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 25vw, 16vw"
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
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
