'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { getPublicOrderProofFiles } from '@/app/actions/market-order-files'
import ImageLightbox, { type LightboxImage } from '@/components/common/ImageLightbox'
import { SpinnerIcon } from '@/components/icons'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import type { MarketOrderFile, MarketOrderFileCategory } from '@/types/market'

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
    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose]
  )

  useEffect(() => {
    getPublicOrderProofFiles(orderReference).then(({ files: data }) => {
      setFiles(data)
      setLoading(false)
    })
  }, [orderReference])

  const lightboxImages: LightboxImage[] = files.map((f) => ({
    url: f.publicUrl,
    caption: f.category === 'shipping' ? t('shippingProof') : t('completionProof'),
    alt: f.name,
    isVideo: f.contentType.startsWith('video/'),
    contentType: f.contentType,
  }))

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: cat === 'shipping' ? t('shippingProof') : t('completionProof'),
    items: files.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0)

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('viewProof')}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="animate-in fade-in zoom-in flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl outline-none duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-gray-900">{t('viewProof')}</h2>
              <p className="mt-0.5 font-mono text-xs text-gray-500">{orderReference}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
            >
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <SpinnerIcon className="h-8 w-8 animate-spin text-ukraine-blue-500" />
              </div>
            ) : files.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                  />
                </svg>
                <p className="text-sm">{t('noFiles')}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {grouped.map((group) => (
                  <div key={group.category}>
                    <p className="mb-2 text-sm font-medium text-gray-600">{group.label}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {group.items.map((file) => {
                        const globalIndex = files.indexOf(file)
                        const isVideo = file.contentType.startsWith('video/')
                        return (
                          <button
                            key={file.path}
                            onClick={() => setLightboxIndex(globalIndex)}
                            className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 transition-all hover:ring-2 hover:ring-ukraine-blue-400"
                          >
                            {isVideo ? (
                              <div className="flex h-full w-full items-center justify-center bg-gray-900">
                                <svg
                                  className="h-8 w-8 text-white opacity-80 transition-opacity group-hover:opacity-100"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element -- 凭证图片由管理员上传，尺寸不固定
                              <img
                                src={file.publicUrl}
                                alt={file.name}
                                className="h-full w-full object-cover"
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
