'use client'

interface Props {
  filesToUpload: File[]
  uploading: boolean
  uploadProgress: number
  hasImageFiles: boolean
  faceBlur: boolean
  setFaceBlur: (v: boolean) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Required upload section shown during a transition that needs files
 * (e.g. delivering → completed).
 */
export default function DonationFileTransitionUpload({
  filesToUpload,
  uploading,
  uploadProgress,
  hasImageFiles,
  faceBlur,
  setFaceBlur,
  onFileChange,
}: Props) {
  return (
    <div className="mb-6">
      <div className="rounded-lg border-2 border-dashed border-blue-300 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 font-body text-sm font-semibold text-gray-700">
          <span className="text-blue-600">📸</span>
          Upload Result Images/Videos
          <span className="text-red-500">*</span>
        </h3>
        <input
          type="file"
          accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime"
          onChange={onFileChange}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          required
          disabled={uploading}
          multiple
        />
        {filesToUpload.length > 0 && !uploading && (
          <div className="mt-3 space-y-1">
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
        {hasImageFiles && (
          <label className="mt-3 flex cursor-pointer select-none items-center gap-2">
            <input
              type="checkbox"
              checked={faceBlur}
              onChange={(e) => setFaceBlur(e.target.checked)}
              disabled={uploading}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto face blur</span>
            <span className="text-xs text-gray-400">(pixelate detected faces via Cloudinary)</span>
          </label>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Accepted formats: JPEG, PNG, GIF, MP4, MOV (max 50MB per file)
        </p>
      </div>
    </div>
  )
}
