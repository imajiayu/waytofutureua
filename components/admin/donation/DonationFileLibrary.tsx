'use client'

import type { DonationFile } from '@/lib/hooks/useDonationFileUpload'

import DonationFileRow from './DonationFileRow'

interface Props {
  files: DonationFile[]
  loadingFiles: boolean
  filesToUpload: File[]
  uploading: boolean
  uploadProgress: number
  hasImageFiles: boolean
  faceBlur: boolean
  setFaceBlur: (v: boolean) => void
  deletingFile: string | null
  confirmDeletePath: string | null
  setConfirmDeletePath: (v: string | null) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeleteFile: (filePath: string) => void
  onUploadOnly: () => void
  onClose: () => void
}

/**
 * Full file management for donations in `completed` state:
 * existing file grid (preview + delete) + upload-new-files panel.
 */
export default function DonationFileLibrary({
  files,
  loadingFiles,
  filesToUpload,
  uploading,
  uploadProgress,
  hasImageFiles,
  faceBlur,
  setFaceBlur,
  deletingFile,
  confirmDeletePath,
  setConfirmDeletePath,
  onFileChange,
  onDeleteFile,
  onUploadOnly,
  onClose,
}: Props) {
  return (
    <div className="mb-6">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 font-body text-sm font-semibold text-gray-700">
          <span>📁</span>
          Result Files Management
        </h3>

        {/* Existing Files */}
        <div className="mb-4">
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-600">Uploaded Files</h4>
          {loadingFiles ? (
            <div className="rounded bg-gray-50 p-4 text-sm text-gray-500">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="rounded bg-gray-50 p-4 text-sm text-gray-500">
              No files uploaded yet
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <DonationFileRow
                  key={file.path}
                  file={file}
                  deletingFile={deletingFile}
                  confirmDeletePath={confirmDeletePath}
                  setConfirmDeletePath={setConfirmDeletePath}
                  onDeleteFile={onDeleteFile}
                />
              ))}
            </div>
          )}
        </div>

        {/* Upload New Files */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="mb-2 text-xs font-medium uppercase text-gray-600">Upload New Files</h4>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime"
              onChange={onFileChange}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              disabled={uploading}
              multiple
            />
            {filesToUpload.length > 0 && !uploading && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-600">
                  {filesToUpload.length} file(s) selected:
                </p>
                {filesToUpload.map((file, index) => (
                  <p key={index} className="ml-2 text-xs text-gray-600">
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
            {hasImageFiles && (
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={faceBlur}
                  onChange={(e) => setFaceBlur(e.target.checked)}
                  disabled={uploading}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto face blur</span>
                <span className="text-xs text-gray-400">
                  (pixelate detected faces via Cloudinary)
                </span>
              </label>
            )}
            <button
              type="button"
              onClick={onUploadOnly}
              disabled={uploading || filesToUpload.length === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {uploading
                ? 'Uploading...'
                : `Upload ${filesToUpload.length > 0 ? `${filesToUpload.length} File(s)` : 'Files'}`}
            </button>
            <p className="text-xs text-gray-500">
              Accepted formats: JPEG, PNG, GIF, MP4, MOV (max 50MB per file)
            </p>
          </div>
        </div>

        {/* Close button */}
        <div className="mt-4 flex justify-end border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
