'use client'

import type { MarketOrderFile, MarketOrderFileCategory } from '@/types/market'

import MarketOrderFileGroup from './MarketOrderFileGroup'

interface Props {
  files: MarketOrderFile[]
  loadingFiles: boolean
  mgmtFiles: File[]
  mgmtCategory: MarketOrderFileCategory
  setMgmtCategory: (v: MarketOrderFileCategory) => void
  uploading: boolean
  uploadProgress: number
  deletingFile: string | null
  confirmDeletePath: string | null
  setConfirmDeletePath: (v: string | null) => void
  onMgmtFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUploadOnly: () => void
  onDeleteFile: (path: string) => void
  showCloseButton: boolean
  onClose: () => void
}

export default function MarketOrderFileLibrary({
  files,
  loadingFiles,
  mgmtFiles,
  mgmtCategory,
  setMgmtCategory,
  uploading,
  uploadProgress,
  deletingFile,
  confirmDeletePath,
  setConfirmDeletePath,
  onMgmtFileChange,
  onUploadOnly,
  onDeleteFile,
  showCloseButton,
  onClose,
}: Props) {
  const shippingFiles = files.filter((f) => f.category === 'shipping')
  const completionFiles = files.filter((f) => f.category === 'completion')

  return (
    <div className="mb-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 font-body text-sm font-semibold text-gray-700">
          📁 Proof Files Management
        </h3>

        {loadingFiles ? (
          <div className="rounded bg-gray-50 p-4 text-sm text-gray-500">Loading files...</div>
        ) : (
          <div className="space-y-4">
            <MarketOrderFileGroup
              label="Shipping Proof"
              files={shippingFiles}
              confirmDeletePath={confirmDeletePath}
              deletingFile={deletingFile}
              onDelete={onDeleteFile}
              onConfirmDelete={setConfirmDeletePath}
            />
            <MarketOrderFileGroup
              label="Fund Usage Proof"
              files={completionFiles}
              confirmDeletePath={confirmDeletePath}
              deletingFile={deletingFile}
              onDelete={onDeleteFile}
              onConfirmDelete={setConfirmDeletePath}
            />
          </div>
        )}

        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-600">Upload New Files</h4>
          <div className="space-y-2">
            <div className="mb-2 flex items-center gap-2">
              <label className="text-sm text-gray-700">Category:</label>
              <select
                value={mgmtCategory}
                onChange={(e) => setMgmtCategory(e.target.value as MarketOrderFileCategory)}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="shipping">Shipping Proof</option>
                <option value="completion">Fund Usage Proof</option>
              </select>
            </div>
            <input
              id="mgmt-file-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
              onChange={onMgmtFileChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              disabled={uploading}
              multiple
            />
            {mgmtFiles.length > 0 && !uploading && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-600">
                  {mgmtFiles.length} file(s) selected
                </p>
                {mgmtFiles.map((file, i) => (
                  <p key={i} className="ml-2 text-xs text-gray-600">
                    • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                ))}
              </div>
            )}
            {uploading && (
              <div>
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
            <button
              type="button"
              onClick={onUploadOnly}
              disabled={uploading || mgmtFiles.length === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {uploading
                ? 'Uploading...'
                : `Upload ${mgmtFiles.length > 0 ? `${mgmtFiles.length} File(s)` : 'Files'}`}
            </button>
            <p className="text-xs text-gray-500">Accepted: JPEG, PNG, GIF, MP4, MOV (max 50MB)</p>
          </div>
        </div>

        {showCloseButton && (
          <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
