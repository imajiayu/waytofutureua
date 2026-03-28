'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { getOrderProofFiles } from '@/app/actions/market-order-files'
import type { MarketOrderFile, MarketOrderFileCategory } from '@/types/market'
import ImageLightbox, { type LightboxImage } from '@/components/common/ImageLightbox'

interface Props {
  orderId: number
  status: string
}

const CATEGORY_ORDER: MarketOrderFileCategory[] = ['shipping', 'completion']

export default function OrderProofSection({ orderId, status }: Props) {
  const t = useTranslations('market.proof')
  const [files, setFiles] = useState<MarketOrderFile[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  useEffect(() => {
    if (!['shipped', 'completed'].includes(status)) {
      setLoading(false)
      return
    }
    getOrderProofFiles(orderId).then(({ files: data }) => {
      setFiles(data)
      setLoading(false)
    })
  }, [orderId, status])

  if (loading) return null
  if (files.length === 0) return null

  const lightboxImages: LightboxImage[] = files.map(f => ({
    url: f.publicUrl,
    caption: f.category === 'shipping' ? t('shippingProof') : t('completionProof'),
    alt: f.name,
    isVideo: f.contentType.startsWith('video/'),
    contentType: f.contentType,
  }))

  // Group by category
  const grouped = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: cat === 'shipping' ? t('shippingProof') : t('completionProof'),
      items: files.filter(f => f.category === cat),
    }))
    .filter(g => g.items.length > 0)

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-sm text-ukraine-blue-600 hover:text-ukraine-blue-800 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {t('viewProof')} ({files.length})
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          {grouped.map(group => (
            <div key={group.category}>
              <p className="text-xs font-medium text-gray-500 mb-1.5">{group.label}</p>
              <div className="flex gap-2 flex-wrap">
                {group.items.map((file) => {
                  const globalIndex = files.indexOf(file)
                  const isImage = file.contentType.startsWith('image/')
                  const isVideo = file.contentType.startsWith('video/')
                  return (
                    <button
                      key={file.path}
                      onClick={() => setLightboxIndex(globalIndex)}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:border-ukraine-blue-400 transition-colors flex-shrink-0"
                    >
                      {isImage && (
                        <img
                          src={file.publicUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {isVideo && (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
      />
    </div>
  )
}
