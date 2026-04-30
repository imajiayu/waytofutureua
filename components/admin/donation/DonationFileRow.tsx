'use client'

import type { DonationFile } from '@/lib/hooks/useDonationFileUpload'

const isImage = (contentType: string) => contentType.startsWith('image/')
const isVideo = (contentType: string) => contentType.startsWith('video/')

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

interface Props {
  file: DonationFile
  deletingFile: string | null
  confirmDeletePath: string | null
  setConfirmDeletePath: (v: string | null) => void
  onDeleteFile: (filePath: string) => void
}

export default function DonationFileRow({
  file,
  deletingFile,
  confirmDeletePath,
  setConfirmDeletePath,
  onDeleteFile,
}: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="truncate text-sm font-medium text-gray-900">{file.name}</span>
            <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
          </div>

          {isImage(file.contentType) && (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- 管理员后台预览，已上传文件尺寸未知 */}
              <img
                src={file.publicUrl}
                alt={file.name}
                className="max-h-48 max-w-full rounded border border-gray-300 sm:max-w-xs"
              />
            </div>
          )}
          {isVideo(file.contentType) && (
            <div className="mb-2">
              <video
                src={file.publicUrl}
                controls
                className="max-h-48 max-w-full rounded border border-gray-300 sm:max-w-xs"
              />
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <a
              href={file.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              View Full Size
            </a>
          </div>
        </div>

        {confirmDeletePath === file.path ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onDeleteFile(file.path)}
              disabled={deletingFile === file.path}
              className="rounded bg-red-700 px-3 py-1 text-sm text-white transition-colors hover:bg-red-800 disabled:opacity-50"
            >
              {deletingFile === file.path ? 'Deleting...' : 'Confirm?'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeletePath(null)}
              className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDeletePath(file.path)}
            disabled={deletingFile === file.path}
            className="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {deletingFile === file.path ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}
