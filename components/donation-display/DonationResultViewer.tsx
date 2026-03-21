'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { XIcon, ImageIcon, Loader2Icon, DownloadIcon, PlayCircleIcon } from '@/components/icons'
import { getAllDonationResultFiles } from '@/app/actions/donation-result'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'
import type { LightboxImage } from '@/components/common/ImageLightbox'
import JSZip from 'jszip'
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
  onClose
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

      // Multiple files: create zip
      const zip = new JSZip()

      // Download all files and add to zip
      for (const file of files) {
        try {
          const response = await fetch(file.originalUrl)
          const blob = await response.blob()
          zip.file(file.name, blob)
        } catch (err) {
          clientLogger.error('DOWNLOAD', `Failed to download file`, { fileName: file.name, error: err instanceof Error ? err.message : String(err) })
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
      clientLogger.error('DOWNLOAD', 'Failed to download zip', { donationPublicId, error: err instanceof Error ? err.message : String(err) })
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
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 font-display">
                {t('title')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('donationId')}: <code className="font-data bg-gray-100 px-2 py-1 rounded text-gray-800">{donationPublicId}</code>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2Icon className="w-12 h-12 text-ukraine-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">{t('loading')}</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-full bg-warm-100 flex items-center justify-center mb-4">
                  <ImageIcon className="w-8 h-8 text-warm-600" />
                </div>
                <p className="text-warm-600 font-medium mb-2">{error}</p>
                <p className="text-sm text-gray-600">{t('contactSupport')}</p>
              </div>
            )}

            {!loading && !error && files.length > 0 && (
              <div className="space-y-4">
                {/* Thumbnail Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {files.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => openLightbox(index)}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-ukraine-blue-500 transition-all group"
                    >
                      {file.isImage && (
                        <>
                          {/* 优先使用缩略图 */}
                          {file.thumbnailUrl ? (
                            <img
                              src={file.thumbnailUrl}
                              alt={`Result ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            // 如果没有缩略图，显示占位符 + 图标
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <ImageIcon className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                        </>
                      )}
                      {file.isVideo && (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <PlayCircleIcon className="w-16 h-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                        <p className="text-white text-xs truncate">{file.name}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2 bg-ukraine-blue-500 text-white rounded-lg hover:bg-ukraine-blue-600 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloading ? (
                      <>
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                        {t('downloading')}
                      </>
                    ) : (
                      <>
                        <DownloadIcon className="w-4 h-4" />
                        {files.length === 1 ? t('download') : `${t('downloadAll')} (${files.length})`}
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
