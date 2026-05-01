import type { ChangeEvent, ReactNode, Ref } from 'react'

interface Props {
  accept: string
  fileInputRef?: Ref<HTMLInputElement>
  files: File[]
  uploading: boolean
  uploadProgress: number
  multiple?: boolean
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
  /** Helper text shown under the upload button. */
  hint: string
  /** Optional suffix appended after "N file(s) selected" — e.g. ":" for donation library. */
  selectedSuffix?: string
  /** Renders above the file input — used for category selectors. */
  topExtras?: ReactNode
  /** Renders between the file list / progress and the upload button — used for face-blur toggle. */
  footerExtras?: ReactNode
}

/**
 * Shared "Upload New Files" panel: file input, selected list, upload progress,
 * upload button and helper hint. Diffs (face-blur / category select) are
 * injected via `topExtras` / `footerExtras` slots.
 */
export default function FileUploadInputPanel({
  accept,
  fileInputRef,
  files,
  uploading,
  uploadProgress,
  multiple = true,
  onChange,
  onUpload,
  hint,
  selectedSuffix = '',
  topExtras,
  footerExtras,
}: Props) {
  return (
    <div className="space-y-2">
      {topExtras}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
        disabled={uploading}
        multiple={multiple}
      />
      {files.length > 0 && !uploading && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-green-600">
            {files.length} file(s) selected{selectedSuffix}
          </p>
          {files.map((file, index) => (
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
      {footerExtras}
      <button
        type="button"
        onClick={onUpload}
        disabled={uploading || files.length === 0}
        className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {uploading
          ? 'Uploading...'
          : `Upload ${files.length > 0 ? `${files.length} File(s)` : 'Files'}`}
      </button>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  )
}
