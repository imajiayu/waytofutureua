'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Database } from '@/types/database'
import AdminBaseModal from './AdminBaseModal'
import {
  updateDonationStatus,
  uploadDonationResultFile,
  createSignedUploadUrl,
  getDonationResultFiles,
  deleteDonationResultFile
} from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/client'
import { clientLogger } from '@/lib/logger-client'
import { formatDateTime } from '@/lib/i18n-utils'
import DonationStatusProgress from './DonationStatusProgress'
import DonationStatusBadge from '@/components/donation-display/DonationStatusBadge'
import {
  getNextAllowedStatuses,
  needsFileUpload as checkNeedsFileUpload,
  canManageFiles as checkCanManageFiles,
  isRefundStatus,
  type DonationStatus
} from '@/lib/donation-status'

type Donation = Database['public']['Tables']['donations']['Row']
type StatusHistory = Database['public']['Tables']['donation_status_history']['Row']

interface Props {
  donation: Donation
  statusHistory: StatusHistory[]
  onClose: () => void
  onSaved: (donation: Donation) => void
}

interface DonationFile {
  name: string
  path: string
  publicUrl: string
  size: number
  contentType: string
  createdAt: string
  updatedAt: string
}

export default function DonationEditModal({ donation, statusHistory, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState<string>('')
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 文件管理状态
  const [files, setFiles] = useState<DonationFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null)
  const [faceBlur, setFaceBlur] = useState(true)

  const currentStatus = (donation.donation_status || '') as DonationStatus
  const allowedStatuses = getNextAllowedStatuses(currentStatus)
  const canUpdate = allowedStatuses.length > 0

  // 检查是否需要上传文件（delivering → completed）
  const needsFileUpload = checkNeedsFileUpload(currentStatus, newStatus as DonationStatus)

  // 检查待上传文件中是否包含图片（用于显示打码开关）
  const hasImageFiles = filesToUpload.some(f => f.type.startsWith('image/'))

  // 检查是否可以管理文件（只有 completed 状态才能独立管理文件）
  const canManageFiles = checkCanManageFiles(currentStatus)

  // 加载现有文件
  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true)
      const result = await getDonationResultFiles(donation.id)
      setFiles(result)
    } catch (err) {
      clientLogger.error('API', 'Failed to load donation files', { donationId: donation.id, error: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoadingFiles(false)
    }
  }, [donation.id])

  useEffect(() => {
    if (canManageFiles) {
      loadFiles()
    } else {
      setLoadingFiles(false)
    }
  }, [canManageFiles, loadFiles])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
    const maxSize = 50 * 1024 * 1024 // 50MB

    // 验证所有文件
    const invalidFiles = selectedFiles.filter(file => !validTypes.includes(file.type))
    if (invalidFiles.length > 0) {
      setError(`Invalid file type: ${invalidFiles.map(f => f.name).join(', ')}. Only images (JPEG, PNG, GIF) and videos (MP4, MOV) are allowed.`)
      return
    }

    const oversizedFiles = selectedFiles.filter(file => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      setError(`File too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 50MB per file.`)
      return
    }

    setFilesToUpload(selectedFiles)
    setError('')
  }

  const uploadFile = async (file: File): Promise<void> => {
    const isImageFile = file.type.startsWith('image/')

    if (isImageFile) {
      // 图片走 Server Action（支持 Cloudinary 人脸打码，图片通常较小不会触发 Vercel 4.5MB 限制）
      const formData = new FormData()
      formData.append('file', file)
      formData.append('donationId', donation.id.toString())
      formData.append('faceBlur', faceBlur ? '1' : '0')
      await uploadDonationResultFile(formData)
    } else {
      // 视频走签名 URL 直传 Supabase Storage（绕过 Vercel 4.5MB 请求体限制）
      const { path, token } = await createSignedUploadUrl(donation.id, file.type)
      const supabase = createClient()
      const { error } = await supabase.storage
        .from('donation-results')
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type,
        })
      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    try {
      setDeletingFile(filePath)
      setConfirmDeletePath(null)
      await deleteDonationResultFile(donation.id, filePath)
      await loadFiles()
    } catch (err: unknown) {
      setError(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingFile(null)
    }
  }

  const handleUploadOnly = async () => {
    if (filesToUpload.length === 0) {
      setError('Please select files to upload')
      return
    }

    setError('')
    setUploading(true)
    setUploadProgress(0)

    try {
      // 上传所有文件
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i]
        // 上传前设置进度
        const progressBefore = Math.round((i / filesToUpload.length) * 100)
        setUploadProgress(progressBefore)

        await uploadFile(file)

        // 上传后更新进度
        const progressAfter = Math.round(((i + 1) / filesToUpload.length) * 100)
        setUploadProgress(progressAfter)
      }

      // 所有文件上传完成后重新加载文件列表
      await loadFiles()

      setFilesToUpload([])
      // 清空文件输入
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err: unknown) {
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const isImage = (contentType: string) => {
    return contentType.startsWith('image/')
  }

  const isVideo = (contentType: string) => {
    return contentType.startsWith('video/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 如果需要上传文件
      if (needsFileUpload) {
        if (filesToUpload.length === 0) {
          setError('Please upload at least one result image/video')
          setLoading(false)
          return
        }

        // 必须包含至少一张图片（邮件需要图片）
        const hasImage = filesToUpload.some(f => f.type.startsWith('image/'))
        if (!hasImage) {
          setError('At least one image file (JPEG, PNG, GIF) is required. Videos alone are not sufficient.')
          setLoading(false)
          return
        }

        setUploading(true)
        setUploadProgress(0)
        try {
          // 上传所有文件
          for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i]
            // 上传前设置进度
            const progressBefore = Math.round((i / filesToUpload.length) * 100)
            setUploadProgress(progressBefore)

            await uploadFile(file)

            // 上传后更新进度
            const progressAfter = Math.round(((i + 1) / filesToUpload.length) * 100)
            setUploadProgress(progressAfter)
          }
        } catch (err: unknown) {
          throw new Error(`File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
        } finally {
          setUploading(false)
          setUploadProgress(0)
        }
      }

      // 更新状态
      const updated = await updateDonationStatus(donation.id, newStatus)
      onSaved(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update donation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminBaseModal title={`Edit Donation #${donation.id}`} onClose={onClose} error={error}>
      <form onSubmit={handleSubmit}>
        {/* Status Progress Visualization + Action Buttons */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Donation Status Flow</h3>
              <DonationStatusProgress
                currentStatus={currentStatus}
                selectedStatus={canUpdate ? newStatus : undefined}
                onStatusSelect={canUpdate ? setNewStatus : undefined}
              />

              {/* Action Buttons */}
              {canUpdate && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  {!newStatus && (
                    <div className="mb-3 p-3 bg-blue-50 text-blue-700 rounded text-sm">
                      👆 Click the next status in the progress bar above to continue
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || uploading || !newStatus}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploading
                        ? 'Uploading...'
                        : loading
                          ? 'Saving...'
                          : 'Update Status'}
                    </button>
                  </div>
                </div>
              )}

              {!canUpdate && !canManageFiles && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="mb-3 p-3 bg-yellow-50 text-yellow-800 rounded text-sm">
                    This donation cannot be updated. Current status: <strong>{currentStatus}</strong>
                    {isRefundStatus(currentStatus as DonationStatus) && (
                      <div className="mt-2 text-xs">
                        ℹ️ Refund statuses are managed automatically by WayForPay and cannot be modified manually.
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* File Upload Section (for delivering → completed) */}
          {needsFileUpload && (
            <div className="mb-6">
              <div className="bg-white rounded-lg p-4 border-2 border-dashed border-blue-300">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 font-body">
                  <span className="text-blue-600">📸</span>
                  Upload Result Images/Videos
                  <span className="text-red-500">*</span>
                </h3>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                      <p key={index} className="text-xs text-gray-600 ml-2">
                        • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    ))}
                  </div>
                )}
                {uploading && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
                {hasImageFiles && (
                  <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
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
          )}

          {/* File Management Section (for completed status) */}
          {canManageFiles && (
            <div className="mb-6">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2 font-body">
                  <span>📁</span>
                  Result Files Management
                </h3>

                {/* Existing Files */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase">Uploaded Files</h4>
                  {loadingFiles ? (
                    <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded">Loading files...</div>
                  ) : files.length === 0 ? (
                    <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded">
                      No files uploaded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {files.map((file) => (
                        <div
                          key={file.path}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({formatFileSize(file.size)})
                                </span>
                              </div>

                              {/* Preview */}
                              {isImage(file.contentType) && (
                                <div className="mb-2">
                                  <img
                                    src={file.publicUrl}
                                    alt={file.name}
                                    className="max-w-full sm:max-w-xs max-h-48 rounded border border-gray-300"
                                  />
                                </div>
                              )}
                              {isVideo(file.contentType) && (
                                <div className="mb-2">
                                  <video
                                    src={file.publicUrl}
                                    controls
                                    className="max-w-full sm:max-w-xs max-h-48 rounded border border-gray-300"
                                  />
                                </div>
                              )}

                              <div className="flex gap-2 mt-2">
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
                                  onClick={() => handleDeleteFile(file.path)}
                                  disabled={deletingFile === file.path}
                                  className="px-3 py-1 text-sm bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50 transition-colors"
                                >
                                  {deletingFile === file.path ? 'Deleting...' : 'Confirm?'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeletePath(null)}
                                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeletePath(file.path)}
                                disabled={deletingFile === file.path}
                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                {deletingFile === file.path ? 'Deleting...' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload New Files */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase">Upload New Files</h4>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={uploading}
                      multiple
                    />
                    {filesToUpload.length > 0 && !uploading && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-600">
                          {filesToUpload.length} file(s) selected:
                        </p>
                        {filesToUpload.map((file, index) => (
                          <p key={index} className="text-xs text-gray-600 ml-2">
                            • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        ))}
                      </div>
                    )}
                    {uploading && (
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {hasImageFiles && (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
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
                    <button
                      type="button"
                      onClick={handleUploadOnly}
                      disabled={uploading || filesToUpload.length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {uploading ? 'Uploading...' : `Upload ${filesToUpload.length > 0 ? `${filesToUpload.length} File(s)` : 'Files'}`}
                    </button>
                    <p className="text-xs text-gray-500">
                      Accepted formats: JPEG, PNG, GIF, MP4, MOV (max 50MB per file)
                    </p>
                  </div>
                </div>

                {/* Close button for completed status */}
                <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* All Donation Info (Read-only) */}
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Basic Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">ID:</span>
                  <span className="ml-2 text-gray-900">{donation.id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Public ID:</span>
                  <span className="ml-2 text-gray-900">{donation.donation_public_id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Project ID:</span>
                  <span className="ml-2 text-gray-900">{donation.project_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-600">Status:</span>
                  <DonationStatusBadge status={currentStatus as DonationStatus} />
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Donor Information</h3>
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Name:</span>
                  <span className="ml-2 text-gray-900">{donation.donor_name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Email:</span>
                  <span className="ml-2 text-gray-900">{donation.donor_email}</span>
                </div>
                {donation.contact_telegram && (
                  <div>
                    <span className="font-medium text-gray-600">Telegram:</span>
                    <span className="ml-2 text-gray-900">{donation.contact_telegram}</span>
                  </div>
                )}
                {donation.contact_whatsapp && (
                  <div>
                    <span className="font-medium text-gray-600">WhatsApp:</span>
                    <span className="ml-2 text-gray-900">{donation.contact_whatsapp}</span>
                  </div>
                )}
                {donation.donor_message && (
                  <div>
                    <span className="font-medium text-gray-600">Message:</span>
                    <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-gray-900">
                      {donation.donor_message}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Payment Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Amount:</span>
                  <span className="ml-2 text-gray-900">
                    {donation.amount} {donation.currency || 'UAH'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Payment Method:</span>
                  <span className="ml-2 text-gray-900">{donation.payment_method || 'N/A'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium text-gray-600">Order Reference:</span>
                  <span className="ml-2 text-gray-900 font-data text-xs">
                    {donation.order_reference}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Timestamps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Donated At:</span>
                  <div className="text-gray-900 text-xs">{formatDateTime(donation.donated_at)}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Created At:</span>
                  <div className="text-gray-900 text-xs">{formatDateTime(donation.created_at)}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Locale:</span>
                  <span className="ml-2 text-gray-900">{donation.locale || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Status History */}
            {statusHistory.length > 0 && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 font-body">Status Change History</h3>
                <div className="space-y-2">
                  {statusHistory.map((history) => (
                    <div key={history.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700 bg-white p-2 rounded">
                      <span className="text-xs text-gray-500 font-data">
                        {formatDateTime(history.changed_at, 'zh', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <span className="text-gray-400">→</span>
                      {history.from_status && (
                        <>
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                            {history.from_status}
                          </span>
                          <span className="text-gray-400">→</span>
                        </>
                      )}
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {history.to_status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
      </form>
    </AdminBaseModal>
  )
}
