'use client'

import type { MarketOrderFile } from '@/types/market'

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

interface Props {
  label: string
  files: MarketOrderFile[]
  confirmDeletePath: string | null
  deletingFile: string | null
  onDelete: (path: string) => void
  onConfirmDelete: (path: string | null) => void
}

export default function MarketOrderFileGroup({
  label,
  files,
  confirmDeletePath,
  deletingFile,
  onDelete,
  onConfirmDelete,
}: Props) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase text-gray-600">{label}</h4>
      {files.length === 0 ? (
        <div className="rounded bg-gray-50 p-3 text-sm text-gray-400">No files</div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.path} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">{file.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                  </div>
                  {file.contentType.startsWith('image/') && (
                    // eslint-disable-next-line @next/next/no-img-element -- 管理员后台预览，已上传文件尺寸未知
                    <img
                      src={file.publicUrl}
                      alt={file.name}
                      className="mb-2 max-h-48 max-w-full rounded border border-gray-300 sm:max-w-xs"
                    />
                  )}
                  {file.contentType.startsWith('video/') && (
                    <video
                      src={file.publicUrl}
                      controls
                      className="mb-2 max-h-48 max-w-full rounded border border-gray-300 sm:max-w-xs"
                    />
                  )}
                  <a
                    href={file.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View Full Size
                  </a>
                </div>

                {confirmDeletePath === file.path ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onDelete(file.path)}
                      disabled={deletingFile === file.path}
                      className="rounded bg-red-700 px-3 py-1 text-sm text-white transition-colors hover:bg-red-800 disabled:opacity-50"
                    >
                      {deletingFile === file.path ? 'Deleting...' : 'Confirm?'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfirmDelete(null)}
                      className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onConfirmDelete(file.path)}
                    disabled={deletingFile === file.path}
                    className="rounded bg-red-600 px-3 py-1 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
