'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createMarketOrderSignedUploadUrl,
  deleteMarketOrderFile,
  getMarketOrderFiles,
  uploadMarketOrderFile,
} from '@/app/actions/market-order-files'
import { createClient } from '@/lib/supabase/client'
import type { MarketOrderFile, MarketOrderFileCategory } from '@/types/market'

const VALID_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
] as const
const MAX_SIZE = 50 * 1024 * 1024

interface Options {
  orderId: number
  autoLoad: boolean
}

/**
 * Encapsulates state + operations for managing market order proof files
 * (shipping / completion category, image via FormData, video via signed URL).
 */
export function useMarketOrderFileUpload({ orderId, autoLoad }: Options) {
  // Selection state
  const [transitionFiles, setTransitionFiles] = useState<File[]>([])
  const [mgmtFiles, setMgmtFiles] = useState<File[]>([])
  const [mgmtCategory, setMgmtCategory] = useState<MarketOrderFileCategory>('shipping')

  // Upload progress
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Existing files
  const [files, setFiles] = useState<MarketOrderFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(autoLoad)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null)

  // Validation error surfaced to consumer
  const [validationError, setValidationError] = useState<string | null>(null)

  const mgmtFileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true)
      const result = await getMarketOrderFiles(orderId)
      setFiles(result)
    } catch {
      // silent
    } finally {
      setLoadingFiles(false)
    }
  }, [orderId])

  useEffect(() => {
    if (autoLoad) {
      loadFiles()
    } else {
      setLoadingFiles(false)
    }
  }, [autoLoad, loadFiles])

  const validateFiles = useCallback((selected: File[]): boolean => {
    const invalid = selected.filter((f) => !(VALID_TYPES as readonly string[]).includes(f.type))
    if (invalid.length > 0) {
      setValidationError(`Invalid file type: ${invalid.map((f) => f.name).join(', ')}`)
      return false
    }
    const oversized = selected.filter((f) => f.size > MAX_SIZE)
    if (oversized.length > 0) {
      setValidationError(`File too large: ${oversized.map((f) => f.name).join(', ')} (max 50MB)`)
      return false
    }
    return true
  }, [])

  const handleTransitionFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || [])
      if (selected.length === 0) return
      if (!validateFiles(selected)) return
      setTransitionFiles(selected)
      setValidationError(null)
    },
    [validateFiles]
  )

  const handleMgmtFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || [])
      if (selected.length === 0) return
      if (!validateFiles(selected)) return
      setMgmtFiles(selected)
      setValidationError(null)
    },
    [validateFiles]
  )

  const uploadFile = useCallback(
    async (file: File, category: MarketOrderFileCategory) => {
      if (file.type.startsWith('image/')) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('orderId', orderId.toString())
        formData.append('category', category)
        await uploadMarketOrderFile(formData)
      } else {
        const { path, token } = await createMarketOrderSignedUploadUrl(orderId, file.type, category)
        const supabase = createClient()
        const { error } = await supabase.storage
          .from('market-order-results')
          .uploadToSignedUrl(path, token, file, { contentType: file.type })
        if (error) throw new Error(`Upload failed: ${error.message}`)
      }
    },
    [orderId]
  )

  /** Batch upload selected files of a given category, with progress reporting. */
  const runBatchUpload = useCallback(
    async (filesToUpload: File[], category: MarketOrderFileCategory) => {
      setUploading(true)
      setUploadProgress(0)
      try {
        for (let i = 0; i < filesToUpload.length; i++) {
          setUploadProgress(Math.round((i / filesToUpload.length) * 100))
          await uploadFile(filesToUpload[i], category)
          setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100))
        }
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [uploadFile]
  )

  const handleUploadOnly = useCallback(async (): Promise<string | null> => {
    if (mgmtFiles.length === 0) return null
    try {
      await runBatchUpload(mgmtFiles, mgmtCategory)
      await loadFiles()
      setMgmtFiles([])
      if (mgmtFileInputRef.current) mgmtFileInputRef.current.value = ''
      return null
    } catch (err: unknown) {
      return `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }, [mgmtFiles, mgmtCategory, runBatchUpload, loadFiles])

  const handleDeleteFile = useCallback(
    async (filePath: string): Promise<string | null> => {
      try {
        setDeletingFile(filePath)
        setConfirmDeletePath(null)
        await deleteMarketOrderFile(orderId, filePath)
        await loadFiles()
        return null
      } catch (err: unknown) {
        return `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      } finally {
        setDeletingFile(null)
      }
    },
    [orderId, loadFiles]
  )

  const clearTransitionFiles = useCallback(() => setTransitionFiles([]), [])

  return {
    // selection
    transitionFiles,
    setTransitionFiles,
    clearTransitionFiles,
    mgmtFiles,
    mgmtCategory,
    setMgmtCategory,
    handleTransitionFileChange,
    handleMgmtFileChange,
    mgmtFileInputRef,
    // existing files
    files,
    loadingFiles,
    deletingFile,
    confirmDeletePath,
    setConfirmDeletePath,
    handleDeleteFile,
    // upload
    uploading,
    uploadProgress,
    runBatchUpload,
    handleUploadOnly,
    // validation surface
    validationError,
    setValidationError,
  }
}
