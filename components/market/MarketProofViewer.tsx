'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { getPublicOrderProofFiles } from '@/app/actions/market-order-files'
import type { MarketOrderFile, MarketOrderFileCategory } from '@/types/market'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import ImageLightbox, { type LightboxImage } from '@/components/common/ImageLightbox'
import { SpinnerIcon } from '@/components/icons'

interface Props {
  orderReference: string
  onClose: () => void
}

const CATEGORY_ORDER: MarketOrderFileCategory[] = ['shipping', 'completion']

export default function MarketProofViewer({ orderReference, onClose }: Props) {
  const t = useTranslations('market.proof')
  const [files, setFiles] = useState<MarketOrderFile[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useBodyScrollLock()

  // Focus trap + Escape key
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    dialogRef.current?.focus()
    return () => { previousFocusRef.current?.focus() }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab' || !dialogRef.current) return
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus()
    }
  }, [onClose])

  useEffect(() => {
    getPublicOrderProofFiles(orderReference).then(({ files: data }) => {
      setFiles(data)
      setLoading(false)
    })
  }, [orderReference])

  const lightboxImages: LightboxImage[] = files.map(f => ({
    url: f.publicUrl,
    caption: f.category === 'shipping' ? t('shippingProof') : t('completionProof'),
    alt: f.name,
    isVideo: f.contentType.startsWith('video/'),
    contentType: f.contentType,
  }))

  const grouped = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: cat === 'shipping' ? t('shippingProof') : t('completionProof'),
      items: files.filter(f => f.category === cat),
    }))
    .filter(g => g.items.length > 0)

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('viewProof')}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200 outline-none"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 font-display">
                {t('viewProof')}
              </h2>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{orderReference}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-5 overflow-y-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <SpinnerIcon className="animate-spin h-8 w-8 text-ukraine-blue-500" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                </svg>
                <p className="text-sm">{t('noFiles')}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.map(group => (
                  <div key={group.category}>
                    <p className="text-sm font-medium text-gray-600 mb-2">{group.label}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {group.items.map(file => {
                        const globalIndex = files.indexOf(file)
                        const isVideo = file.contentType.startsWith('video/')
                        return (
                          <button
                            key={file.path}
                            onClick={() => setLightboxIndex(globalIndex)}
                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-ukraine-blue-400 transition-all group"
                          >
                            {isVideo ? (
                              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                <svg className="w-8 h-8 text-white opacity-80 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            ) : (
                              <img
                                src={file.publicUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
      />
    </>,
    document.body
  )
}
