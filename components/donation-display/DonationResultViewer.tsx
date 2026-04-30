'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { getAllDonationResultFiles } from '@/app/actions/donation-result'
import type { LightboxImage } from '@/components/common/ImageLightbox'
import { DownloadIcon, ImageIcon, Loader2Icon, PlayCircleIcon, XIcon } from '@/components/icons'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import { clientLogger } from '@/lib/logger-client'

// P2 优化: 动态加载灯箱组件
const ImageLightbox = dynamic(() => import('@/components/common/ImageLightbox'), { ssr: false })

interface DonationResultViewerProps {
  donationPublicId: string
  onClose: () => void
}

interface DonationFile {
  name: string
  originalUrl: string
  thumbnailUrl: string | null
  isImage: boolean
  isVideo: boolean
  size: number
  contentType: string
}

export default function DonationResultViewer({
  donationPublicId,
  onClose,
}: DonationResultViewerProps) {
  const t = useTranslations('donationResult')
  const [files, setFiles] = useState<DonationFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    async function fetchFiles() {
      try {
        setLoading(true)
        setError(null)
        const result = await getAllDonationResultFiles(donationPublicId)

        if (result.error) {
          setError(t(`errors.${result.error}`))
        } else if (result.files && result.files.length > 0) {
          setFiles(result.files)
        } else {
          setError(t('errors.noImage'))
        }
      } catch (err) {
        setError(t('errors.loadFailed'))
      } finally {
        setLoading(false)
      }
    }

    fetchFiles()
  }, [donationPublicId, t])

  // Prepare images for lightbox
  const lightboxImages = useMemo<LightboxImage[]>(
    () =>
      files.map((file) => ({
        url: file.originalUrl,
        caption: file.name,
        alt: file.name,
        isVideo: file.isVideo,
        contentType: file.contentType,
        thumbnailUrl: file.thumbnailUrl,
      })),
    [files]
  )

  const handleDownloadAll = async () => {
    if (files.length === 0) return

    try {
      setDownloading(true)

      // If only one file, download it directly without zipping
      if (files.length === 1) {
        const file = files[0]
        const link = document.createElement('a')
        link.href = file.originalUrl
        link.download = file.name
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }

      // Multiple files: create zip (动态加载 jszip，避免 ~100KB gzip 进入初始 bundle)
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Download all files and add to zip
      for (const file of files) {
        try {
          const response = await fetch(file.originalUrl)
          const blob = await response.blob()
          zip.file(file.name, blob)
        } catch (err) {
          clientLogger.error('DOWNLOAD', `Failed to download file`, {
            fileName: file.name,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }

      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `donation-${donationPublicId}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
    } catch (err) {
      clientLogger.error('DOWNLOAD', 'Failed to download zip', {
        donationPublicId,
        error: err instanceof Error ? err.message : String(err),
      })
      alert(t('errors.downloadFailed'))
    } finally {
      setDownloading(false)
    }
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  useBodyScrollLock()

  return (
    <>
      {/* Main Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
        onClick={onClose}
      >
        <div
          className="animate-in fade-in zoom-in max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-gray-900">{t('title')}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {t('donationId')}:{' '}
                <code className="rounded bg-gray-100 px-2 py-1 font-data text-gray-800">
                  {donationPublicId}
                </code>
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 transition-colors hover:bg-gray-100"
              aria-label={t('close')}
            >
              <XIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2Icon className="mb-4 h-12 w-12 animate-spin text-ukraine-blue-500" />
                <p className="text-gray-600">{t('loading')}</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warm-100">
                  <ImageIcon className="h-8 w-8 text-warm-600" />
                </div>
                <p className="mb-2 font-medium text-warm-600">{error}</p>
                <p className="text-sm text-gray-600">{t('contactSupport')}</p>
              </div>
            )}

            {!loading && !error && files.length > 0 && (
              <div className="space-y-4">
                {/* Thumbnail Grid */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {files.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => openLightbox(index)}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 transition-all hover:ring-2 hover:ring-ukraine-blue-500"
                    >
                      {file.isImage && (
                        <>
                          {/* 优先使用缩略图 */}
                          {file.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Cloudinary 缩略图任意尺寸，aspect-square 容器内已 contain
                            <img
                              src={file.thumbnailUrl}
                              alt={t('resultThumbnailAlt', { index: index + 1 })}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            // 如果没有缩略图，显示占位符 + 图标
                            <div className="flex h-full w-full items-center justify-center bg-gray-200">
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </>
                      )}
                      {file.isVideo && (
                        <div className="flex h-full w-full items-center justify-center bg-gray-900">
                          <PlayCircleIcon className="h-16 w-16 text-white opacity-80 transition-opacity group-hover:opacity-100" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                        <p className="truncate text-xs text-white">{file.name}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 border-t pt-4">
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloading}
                    className="flex items-center gap-2 rounded-lg bg-ukraine-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ukraine-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloading ? (
                      <>
                        <Loader2Icon className="h-4 w-4 animate-spin" />
                        {t('downloading')}
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="h-4 w-4" />
                        {files.length === 1
                          ? t('download')
                          : `${t('downloadAll')} (${files.length})`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox - 仅在打开时渲染 */}
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
