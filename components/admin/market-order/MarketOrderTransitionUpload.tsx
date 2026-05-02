'use client'

import { MARKET_ORDER_CATEGORY_LABELS } from '@/lib/market/market-categories'
import type { MarketOrderFileCategory } from '@/types/market'

interface Props {
  category: MarketOrderFileCategory
  files: File[]
  uploading: boolean
  uploadProgress: number
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function MarketOrderTransitionUpload({
  category,
  files,
  uploading,
  uploadProgress,
  onFileChange,
}: Props) {
  return (
    <div className="mb-6">
      <div className="rounded-lg border-2 border-dashed border-blue-300 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 font-body text-sm font-semibold text-gray-700">
          <span className="text-blue-600">📸</span>
          Upload {MARKET_ORDER_CATEGORY_LABELS[category]}
          <span className="text-red-500">*</span>
        </h3>
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
          onChange={onFileChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          required
          disabled={uploading}
          multiple
        />
        {files.length > 0 && !uploading && (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium text-green-600">{files.length} file(s) selected:</p>
            {files.map((file, index) => (
              <p key={index} className="ml-2 text-xs text-gray-600">
                • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            ))}
          </div>
        )}
        {uploading && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-sm text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Accepted: JPEG, PNG, GIF, MP4, MOV (max 50MB per file). At least one image required.
        </p>
      </div>
    </div>
  )
}
