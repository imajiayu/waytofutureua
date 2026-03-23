'use client'

import Image from 'next/image'
import { CalendarIcon, MapPinIcon } from '@/components/icons'
import { useTranslations } from 'next-intl'
import { formatDate, type SupportedLocale } from '@/lib/i18n-utils'
import { formatCurrency } from '@/lib/utils'
import { SectionHeader } from '@/components/projects/shared'
import type { EventsContent } from '../types'

interface EventsSectionProps {
  events: EventsContent
  locale: string
  onImageClick: (eventIndex: number, imageIndex: number) => void
}

export default function EventsSection({ events, locale, onImageClick }: EventsSectionProps) {
  const t = useTranslations('projects.project5')

  return (
    <section className="bg-white rounded-xl md:rounded-2xl shadow-sm overflow-hidden p-5 md:p-8">
      <SectionHeader title={events.title} gradientClassName="from-cyan-400 to-teal-500" className="mb-5" />

      {/* Events List */}
      <div className="space-y-6">
        {events.list.map((event, eventIdx) => (
          <div key={eventIdx}>
            {/* Event Meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
              <div className="flex items-center gap-1.5 text-gray-600">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">
                  {formatDate(event.date, locale as SupportedLocale)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <MapPinIcon className="w-3.5 h-3.5" />
                <span className="text-sm">{event.location}</span>
              </div>
            </div>

            {/* Photo Grid: 1 large + all remaining as small */}
            {event.images.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                {/* Large feature image - spans 2 cols and 2 rows */}
                <div
                  className="col-span-2 row-span-2 relative aspect-[3/2] rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
                  onClick={() => onImageClick(eventIdx, 0)}
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

                {/* All remaining images */}
                {event.images.slice(1).map((img, imgIdx) => (
                  <div
                    key={imgIdx}
                    className="relative aspect-square rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
                    onClick={() => onImageClick(eventIdx, imgIdx + 1)}
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
            )}

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
          </div>
        ))}
      </div>
    </section>
  )
}
