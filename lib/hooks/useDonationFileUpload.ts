'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createSignedUploadUrl,
  deleteDonationResultFile,
  getDonationResultFiles,
  processUploadedImage,
} from '@/app/actions/admin'
import { MAX_MEDIA_FILE_SIZE, validateMediaFiles } from '@/lib/file-validation'
import { clientLogger } from '@/lib/logger-client'
import { createClient } from '@/lib/supabase/client'

export interface DonationFile {
  name: string
  path: string
  publicUrl: string
  size: number
  contentType: string
  createdAt: string
  updatedAt: string
}

// Donation result files: legacy type set (no webp).
const VALID_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/quicktime',
] as const
const MAX_SIZE = MAX_MEDIA_FILE_SIZE

interface Options {
  donationId: number
  /** When true, file list is fetched on mount. */
  autoLoad: boolean
}

/**
 * Encapsulates all state + ops for managing donation result files
 * (selection, validation, upload to Supabase Storage with progress,
 * Cloudinary face-blur post-processing, listing, deletion).
 */
export function useDonationFileUpload({ donationId, autoLoad }: Options) {
  const [filesToUpload, setFilesToUpload] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [faceBlur, setFaceBlur] = useState(false)
  const [files, setFiles] = useState<DonationFile[]>([])
  const [loadingFiles, setLoadingFiles] = useState(autoLoad)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [confirmDeletePath, setConfirmDeletePath] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasImageFiles = filesToUpload.some((f) => f.type.startsWith('image/'))

  const loadFiles = useCallback(async () => {
    try {
      setLoadingFiles(true)
      const result = await getDonationResultFiles(donationId)
      setFiles(result)
    } catch (err) {
      clientLogger.error('API', 'Failed to load donation files', {
        donationId,
        error: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setLoadingFiles(false)
    }
  }, [donationId])

  useEffect(() => {
    if (autoLoad) {
      loadFiles()
    } else {
      setLoadingFiles(false)
    }
  }, [autoLoad, loadFiles])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    const result = validateMediaFiles(selectedFiles, {
      allowed: VALID_TYPES,
      maxSize: MAX_SIZE,
      formatInvalidType: (names) =>
        `Invalid file type: ${names.join(', ')}. Only images (JPEG, PNG, GIF) and videos (MP4, MOV) are allowed.`,
      formatOversized: (names) =>
        `File too large: ${names.join(', ')}. Maximum size is 50MB per file.`,
    })
    if (!result.ok) {
      setValidationError(result.error)
      return
    }

    setFilesToUpload(selectedFiles)
    setValidationError(null)
  }, [])

  /** Upload a single file. Returns the post-processed image URL when applicable. */
  const uploadFile = useCallback(
    async (file: File): Promise<string | undefined> => {
      const isImageFile = file.type.startsWith('image/')
      const { path, token } = await createSignedUploadUrl(donationId, file.type)
      const supabase = createClient()
      const { error } = await supabase.storage
        .from('donation-results')
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type,
        })
      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      if (isImageFile) {
        try {
          const result = await processUploadedImage(donationId, path, faceBlur)
          return result.publicUrl
        } catch {
          const {
            data: { publicUrl },
          } = supabase.storage.from('donation-results').getPublicUrl(path)
          return publicUrl
        }
      }

      return undefined
    },
    [donationId, faceBlur]
  )

  /** Upload all selected files with progress; returns the first uploaded image URL. */
  const runBatchUpload = useCallback(async (): Promise<string | undefined> => {
    if (filesToUpload.length === 0) return undefined
    setUploading(true)
    setUploadProgress(0)
    let firstUrl: string | undefined
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        setUploadProgress(Math.round((i / filesToUpload.length) * 100))
        const url = await uploadFile(filesToUpload[i])
        if (!firstUrl && url) firstUrl = url
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100))
      }
      return firstUrl
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [filesToUpload, uploadFile])

  const resetFileInput = useCallback(() => {
    setFilesToUpload([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const handleUploadOnly = useCallback(async (): Promise<string | null> => {
    if (filesToUpload.length === 0) {
      return 'Please select files to upload'
    }
    try {
      await runBatchUpload()
      await loadFiles()
      resetFileInput()
      return null
    } catch (err: unknown) {
      return `Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    }
  }, [filesToUpload.length, runBatchUpload, loadFiles, resetFileInput])

  const handleDeleteFile = useCallback(
    async (filePath: string): Promise<string | null> => {
      try {
        setDeletingFile(filePath)
        setConfirmDeletePath(null)
        await deleteDonationResultFile(donationId, filePath)
        await loadFiles()
        return null
      } catch (err: unknown) {
        return `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      } finally {
        setDeletingFile(null)
      }
    },
    [donationId, loadFiles]
  )

  return {
    // selection state
    filesToUpload,
    setFilesToUpload,
    hasImageFiles,
    faceBlur,
    setFaceBlur,
    validationError,
    handleFileChange,
    fileInputRef,
    // existing files
    files,
    loadingFiles,
    loadFiles,
    deletingFile,
    confirmDeletePath,
    setConfirmDeletePath,
    handleDeleteFile,
    // upload
    uploading,
    uploadProgress,
    runBatchUpload,
    handleUploadOnly,
    resetFileInput,
  }
}
