'use client'

import { useCallback, useEffect, useState } from 'react'

import { updateMarketOrderStatus } from '@/app/actions/market-admin'
import {
  createMarketOrderSignedUploadUrl,
  deleteMarketOrderFile,
  getMarketOrderFiles,
  uploadMarketOrderFile,
} from '@/app/actions/market-order-files'
import { getTranslatedText } from '@/lib/i18n-utils'
import {
  canManageOrderFiles,
  getFileCategory,
  getNextOrderStatuses,
  needsFileUpload,
  needsTrackingNumber,
  ORDER_STATUS_COLORS,
} from '@/lib/market/market-status'
import { createClient } from '@/lib/supabase/client'
import type {
  AdminMarketOrder,
  MarketOrderFile,
  MarketOrderFileCategory,
  MarketOrderStatus,
} from '@/types/market'

import AdminBaseModal from './AdminBaseModal'

interface Props {
  order: AdminMarketOrder
  onClose: () => void
  onSaved: () => void
}

const VALID_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
]
const MAX_SIZE = 50 * 1024 * 1024

const CATEGORY_LABELS: Record<MarketOrderFileCategory, string> = {
  shipping: 'Shipping Proof',
  completion: 'Fund Usage Proof',
}

export default function MarketOrderEditModal({ order, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState<MarketOrderStatus | ''>('')
  const [transitionFiles, setTransitionFiles] = useState<File[]>([])
  const [mgmtFiles, setMgmtFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Tracking number (for paid → shipped)
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '')
  const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier || '')

  // File management
  const [files, setFiles] = useState<MarketOrderFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null)

  // File upload for management section (independent of status transition)
  const [mgmtCategory, setMgmtCategory] = useState<MarketOrderFileCategory>('shipping')

  const currentStatus = order.status as MarketOrderStatus
  const nextStatuses = getNextOrderStatuses(currentStatus)
  const canUpdate = nextStatuses.length > 0
  const canManageFiles = canManageOrderFiles(currentStatus)

  const selectedCategory = newStatus
    ? getFileCategory(currentStatus, newStatus as MarketOrderStatus)
    : null
  const showFileUpload = newStatus && needsFileUpload(currentStatus, newStatus as MarketOrderStatus)
  const showTrackingInput =
    newStatus && needsTrackingNumber(currentStatus, newStatus as MarketOrderStatus)

  const itemTitle = order.market_items
    ? getTranslatedText(order.market_items.title_i18n, null, 'en')
    : `#${order.item_id}`

  // Load existing files
  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true)
      const result = await getMarketOrderFiles(order.id)
      setFiles(result)
    } catch {
      // silent
    } finally {
      setLoadingFiles(false)
    }
  }, [order.id])

  useEffect(() => {
    if (canManageFiles) {
      loadFiles()
    } else {
      setLoadingFiles(false)
    }
  }, [canManageFiles, loadFiles])

  // ── File handlers ────────────────────────────

  const validateFiles = (selected: File[]): boolean => {
    const invalid = selected.filter((f) => !VALID_TYPES.includes(f.type))
    if (invalid.length > 0) {
      setError(`Invalid file type: ${invalid.map((f) => f.name).join(', ')}`)
      return false
    }
    const oversized = selected.filter((f) => f.size > MAX_SIZE)
    if (oversized.length > 0) {
      setError(`File too large: ${oversized.map((f) => f.name).join(', ')} (max 50MB)`)
      return false
    }
    return true
  }

  const handleTransitionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    if (!validateFiles(selected)) return
    setTransitionFiles(selected)
    setError('')
  }

  const handleMgmtFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    if (!validateFiles(selected)) return
    setMgmtFiles(selected)
    setError('')
  }

  const uploadFile = async (file: File, category: MarketOrderFileCategory) => {
    if (file.type.startsWith('image/')) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('orderId', order.id.toString())
      formData.append('category', category)
      await uploadMarketOrderFile(formData)
    } else {
      // Video → signed URL direct upload
      const { path, token } = await createMarketOrderSignedUploadUrl(order.id, file.type, category)
      const supabase = createClient()
      const { error } = await supabase.storage
        .from('market-order-results')
        .uploadToSignedUrl(path, token, file, { contentType: file.type })
      if (error) throw new Error(`Upload failed: ${error.message}`)
    }
  }

  const handleDeleteFile = async (filePath: string) => {
    try {
      setDeletingFile(filePath)
      setConfirmDeletePath(null)
      await deleteMarketOrderFile(order.id, filePath)
      await loadFiles()
    } catch (err: unknown) {
      setError(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingFile(null)
    }
  }

  const handleUploadOnly = async () => {
    if (mgmtFiles.length === 0) return
    setError('')
    setUploading(true)
    setUploadProgress(0)
    try {
      for (let i = 0; i < mgmtFiles.length; i++) {
        setUploadProgress(Math.round((i / mgmtFiles.length) * 100))
        await uploadFile(mgmtFiles[i], mgmtCategory)
        setUploadProgress(Math.round(((i + 1) / mgmtFiles.length) * 100))
      }
      await loadFiles()
      setMgmtFiles([])
      const input = document.querySelector('#mgmt-file-input') as HTMLInputElement
      if (input) input.value = ''
    } catch (err: unknown) {
      setError(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // ── Submit (status transition) ───────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStatus) return
    setError('')
    setLoading(true)

    try {
      // Validate tracking number BEFORE uploading files (avoid wasted uploads)
      if (showTrackingInput && !trackingNumber.trim()) {
        setError('Tracking number is required')
        setLoading(false)
        return
      }

      // Upload files if needed
      if (showFileUpload && selectedCategory) {
        if (transitionFiles.length === 0) {
          setError(`Please upload at least one ${CATEGORY_LABELS[selectedCategory]} file`)
          setLoading(false)
          return
        }
        const hasImage = transitionFiles.some((f) => f.type.startsWith('image/'))
        if (!hasImage) {
          setError('At least one image file is required. Videos alone are not sufficient.')
          setLoading(false)
          return
        }

        setUploading(true)
        setUploadProgress(0)
        try {
          for (let i = 0; i < transitionFiles.length; i++) {
            setUploadProgress(Math.round((i / transitionFiles.length) * 100))
            await uploadFile(transitionFiles[i], selectedCategory)
            setUploadProgress(Math.round(((i + 1) / transitionFiles.length) * 100))
          }
        } catch (err: unknown) {
          throw new Error(
            `File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        } finally {
          setUploading(false)
          setUploadProgress(0)
        }
      }

      // Update status
      const result = await updateMarketOrderStatus(order.id, newStatus as MarketOrderStatus, {
        tracking_number: trackingNumber.trim() || undefined,
        tracking_carrier: trackingCarrier.trim() || undefined,
      })

      if (!result.success) {
        setError(result.error || 'Failed to update status')
        setLoading(false)
        return
      }

      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update order')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // Group files by category
  const shippingFiles = files.filter((f) => f.category === 'shipping')
  const completionFiles = files.filter((f) => f.category === 'completion')

  return (
    <AdminBaseModal title={`Order: ${order.order_reference}`} onClose={onClose} error={error}>
      <form onSubmit={handleSubmit}>
        {/* ── Order Info ─────────────────────────── */}
        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="font-medium text-gray-600">Buyer:</span>
              <span className="ml-2 text-gray-900">{order.buyer_email}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Item:</span>
              <span className="ml-2 text-gray-900">{itemTitle}</span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Amount:</span>
              <span className="ml-2 text-gray-900">
                {order.quantity} × ${order.unit_price} = ${order.total_amount}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-600">Status:</span>
              <span
                className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[currentStatus].bg} ${ORDER_STATUS_COLORS[currentStatus].text}`}
              >
                {currentStatus}
              </span>
            </div>
            {order.tracking_number && (
              <div>
                <span className="font-medium text-gray-600">Tracking:</span>
                <span className="ml-2 font-mono text-xs text-gray-900">
                  {order.tracking_number}
                </span>
                {order.tracking_carrier && (
                  <span className="ml-1 text-gray-500">({order.tracking_carrier})</span>
                )}
              </div>
            )}
            <div>
              <span className="font-medium text-gray-600">Shipping:</span>
              <span className="ml-2 text-gray-900">
                {order.shipping_name}, {order.shipping_city}, {order.shipping_country}
              </span>
            </div>
          </div>
        </div>

        {/* ── Section 1: Status Update ──────────── */}
        {canUpdate && (
          <div className="mb-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 font-body text-sm font-semibold text-gray-700">Update Status</h3>

              <div className="mb-4 flex gap-2">
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setNewStatus(status)
                      setTransitionFiles([])
                      setError('')
                    }}
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      newStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    → {status}
                  </button>
                ))}
              </div>

              {/* Tracking number input */}
              {showTrackingInput && (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Tracking Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. UA123456789"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Carrier (optional)
                    </label>
                    <input
                      type="text"
                      value={trackingCarrier}
                      onChange={(e) => setTrackingCarrier(e.target.value)}
                      placeholder="e.g. Nova Poshta"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end space-x-3 border-t border-gray-200 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading || !newStatus}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : loading ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Section 2: File Upload for Transition ─ */}
        {showFileUpload && selectedCategory && (
          <div className="mb-6">
            <div className="rounded-lg border-2 border-dashed border-blue-300 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 font-body text-sm font-semibold text-gray-700">
                <span className="text-blue-600">📸</span>
                Upload {CATEGORY_LABELS[selectedCategory]}
                <span className="text-red-500">*</span>
              </h3>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
                onChange={handleTransitionFileChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                required
                disabled={uploading}
                multiple
              />
              {transitionFiles.length > 0 && !uploading && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-green-600">
                    {transitionFiles.length} file(s) selected:
                  </p>
                  {transitionFiles.map((file, index) => (
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
        )}

        {/* ── Section 3: File Management ──────────── */}
        {canManageFiles && (
          <div className="mb-6">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-3 flex items-center gap-2 font-body text-sm font-semibold text-gray-700">
                📁 Proof Files Management
              </h3>

              {/* Existing files grouped by category */}
              {loadingFiles ? (
                <div className="rounded bg-gray-50 p-4 text-sm text-gray-500">Loading files...</div>
              ) : (
                <div className="space-y-4">
                  {/* Shipping Proof */}
                  <FileGroup
                    label="Shipping Proof"
                    files={shippingFiles}
                    confirmDeletePath={confirmDeletePath}
                    deletingFile={deletingFile}
                    onDelete={handleDeleteFile}
                    onConfirmDelete={setConfirmDeletePath}
                    formatFileSize={formatFileSize}
                  />
                  {/* Fund Usage Proof */}
                  <FileGroup
                    label="Fund Usage Proof"
                    files={completionFiles}
                    confirmDeletePath={confirmDeletePath}
                    deletingFile={deletingFile}
                    onDelete={handleDeleteFile}
                    onConfirmDelete={setConfirmDeletePath}
                    formatFileSize={formatFileSize}
                  />
                </div>
              )}

              {/* Upload new files */}
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h4 className="mb-2 text-xs font-medium uppercase text-gray-600">
                  Upload New Files
                </h4>
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
                    onChange={handleMgmtFileChange}
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
                    onClick={handleUploadOnly}
                    disabled={uploading || mgmtFiles.length === 0}
                    className="rounded-md bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                  >
                    {uploading
                      ? 'Uploading...'
                      : `Upload ${mgmtFiles.length > 0 ? `${mgmtFiles.length} File(s)` : 'Files'}`}
                  </button>
                  <p className="text-xs text-gray-500">
                    Accepted: JPEG, PNG, GIF, MP4, MOV (max 50MB)
                  </p>
                </div>
              </div>

              {/* Close button */}
              {!canUpdate && (
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
        )}
      </form>
    </AdminBaseModal>
  )
}

// ── Sub-component: File group ────────────────────

function FileGroup({
  label,
  files,
  confirmDeletePath,
  deletingFile,
  onDelete,
  onConfirmDelete,
  formatFileSize,
}: {
  label: string
  files: MarketOrderFile[]
  confirmDeletePath: string | null
  deletingFile: string | null
  onDelete: (path: string) => void
  onConfirmDelete: (path: string | null) => void
  formatFileSize: (bytes: number) => string
}) {
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
