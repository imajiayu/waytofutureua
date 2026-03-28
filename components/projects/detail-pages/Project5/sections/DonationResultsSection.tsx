'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { CheckCircle2Icon } from '@/components/icons'
import type { LightboxImage } from '@/components/common/ImageLightbox'
import type { DonationResultItem, DonationResultsData } from '../types'

const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

interface DonationResultsSectionProps {
  donationResults: DonationResultsData
}

function getItemRatio(item: DonationResultItem): number {
  if (item.aspectRatio) return item.aspectRatio
  return (item.orientation || 'landscape') === 'portrait' ? 9 / 16 : 16 / 9
}

function packIntoRows(items: DonationResultItem[], targetRatioSum = 2.5): number[][] {
  const rows: number[][] = []
  let currentRow: number[] = []
  let currentSum = 0

  items.forEach((item, idx) => {
    const ratio = getItemRatio(item)
    if (currentRow.length > 0 && currentSum + ratio > targetRatioSum) {
      rows.push(currentRow)
      currentRow = [idx]
      currentSum = ratio
    } else {
      currentRow.push(idx)
      currentSum += ratio
    }
  })
  if (currentRow.length > 0) rows.push(currentRow)
  return rows
}

export default function DonationResultsSection({ donationResults }: DonationResultsSectionProps) {
  const t = useTranslations('projects')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const lightboxImages = useMemo<LightboxImage[]>(
    () => donationResults.items.map((item) => ({ url: item.image })),
    [donationResults.items]
  )

  const rows = useMemo(
    () => packIntoRows(donationResults.items),
    [donationResults.items]
  )

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="w-5 h-5 text-white/90" />
            <h2 className="text-lg md:text-xl font-bold font-display text-white">
              {donationResults.title}
            </h2>
          </div>
          <p className="text-xs md:text-sm text-white/75 mt-1 leading-relaxed">
            {donationResults.description}
          </p>
        </div>

        {/* Justified gallery with row packing */}
        <div className="p-3 md:p-4 space-y-3">
          <div className="space-y-2.5 md:space-y-3">
            {rows.map((rowIndices, rowIdx) => (
              <div key={rowIdx} className="flex flex-col sm:flex-row gap-2.5 md:gap-3">
                {rowIndices.map((idx) => {
                  const item = donationResults.items[idx]
                  const ratio = getItemRatio(item)

                  return (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      className="group relative rounded-xl overflow-hidden cursor-pointer min-w-0"
                      style={{ flex: `${Math.round(ratio * 100)} 1 0%` }}
                      onClick={() => openLightbox(idx)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openLightbox(idx)
                        }
                      }}
                    >
                      <Image
                        src={item.image}
                        alt={t('project5.donationResultAlt', { index: idx + 1 })}
                        width={800}
                        height={Math.round(800 / ratio)}
                        className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
                      />

                      {item.donationIds.length > 0 && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 md:p-3 pt-6">
                          <div className="flex flex-wrap gap-1 md:gap-1.5">
                            {item.donationIds.map((id, i) => (
                              <code
                                key={i}
                                className="font-data text-[9px] md:text-[11px] bg-white/15 backdrop-blur-sm text-white px-1 md:px-1.5 py-0.5 rounded border border-white/20 font-medium tracking-wide"
                              >
                                {id}
                              </code>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Verification Footer */}
          <div className="flex items-start gap-2.5 p-3 bg-teal-50/80 rounded-lg border border-teal-100/50">
            <CheckCircle2Icon className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs md:text-sm text-teal-700 leading-relaxed">
              {donationResults.footer}
            </p>
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
