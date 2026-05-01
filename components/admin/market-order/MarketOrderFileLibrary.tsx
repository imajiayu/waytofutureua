'use client'

import type { MarketOrderFile, MarketOrderFileCategory } from '@/types/market'

import FileUploadInputPanel from '../ui/FileUploadInputPanel'
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
  mgmtFileInputRef?: React.Ref<HTMLInputElement>
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
  mgmtFileInputRef,
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
          <FileUploadInputPanel
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
            fileInputRef={mgmtFileInputRef}
            files={mgmtFiles}
            uploading={uploading}
            uploadProgress={uploadProgress}
            onChange={onMgmtFileChange}
            onUpload={onUploadOnly}
            hint="Accepted: JPEG, PNG, GIF, MP4, MOV (max 50MB)"
            topExtras={
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
            }
          />
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
