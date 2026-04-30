'use client'

import { useState } from 'react'

import { updateDonationStatus } from '@/app/actions/admin'
import {
  canManageFiles as checkCanManageFiles,
  type DonationStatus,
  getNextAllowedStatuses,
  needsFileUpload as checkNeedsFileUpload,
} from '@/lib/donation-status'
import { useDonationFileUpload } from '@/lib/hooks/useDonationFileUpload'
import type { Database } from '@/types/database'

import AdminBaseModal from './AdminBaseModal'
import DonationFileLibrary from './donation/DonationFileLibrary'
import DonationFileTransitionUpload from './donation/DonationFileTransitionUpload'
import DonationHistorySection from './donation/DonationHistorySection'
import DonationInfoPanel from './donation/DonationInfoPanel'
import DonationStatusSection from './donation/DonationStatusSection'

type Donation = Database['public']['Tables']['donations']['Row']
type StatusHistory = Database['public']['Tables']['donation_status_history']['Row']

interface Props {
  donation: Donation
  statusHistory: StatusHistory[]
  onClose: () => void
  onSaved: (donation: Donation) => void
}

export default function DonationEditModal({ donation, statusHistory, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentStatus = (donation.donation_status || '') as DonationStatus
  const allowedStatuses = getNextAllowedStatuses(currentStatus)
  const canUpdate = allowedStatuses.length > 0
  const canManageFiles = checkCanManageFiles(currentStatus)
  const needsFileUpload = checkNeedsFileUpload(currentStatus, newStatus as DonationStatus)

  const fileUpload = useDonationFileUpload({
    donationId: donation.id,
    autoLoad: canManageFiles,
  })

  // Surface validation errors from file selection
  const displayError = error || fileUpload.validationError || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let uploadedImageUrl: string | undefined
      if (needsFileUpload && fileUpload.filesToUpload.length > 0) {
        try {
          uploadedImageUrl = await fileUpload.runBatchUpload()
        } catch (err: unknown) {
          throw new Error(
            `File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

      const updated = await updateDonationStatus(donation.id, newStatus, uploadedImageUrl)
      onSaved(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update donation')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadOnly = async () => {
    const errMsg = await fileUpload.handleUploadOnly()
    if (errMsg) setError(errMsg)
    else setError('')
  }

  const handleDeleteFile = async (filePath: string) => {
    const errMsg = await fileUpload.handleDeleteFile(filePath)
    if (errMsg) setError(errMsg)
  }

  return (
    <AdminBaseModal title={`Edit Donation #${donation.id}`} onClose={onClose} error={displayError}>
      <form onSubmit={handleSubmit}>
        <DonationStatusSection
          currentStatus={currentStatus}
          newStatus={newStatus}
          setNewStatus={setNewStatus}
          canUpdate={canUpdate}
          canManageFiles={canManageFiles}
          loading={loading}
          uploading={fileUpload.uploading}
          onClose={onClose}
        />

        {needsFileUpload && (
          <DonationFileTransitionUpload
            filesToUpload={fileUpload.filesToUpload}
            uploading={fileUpload.uploading}
            uploadProgress={fileUpload.uploadProgress}
            hasImageFiles={fileUpload.hasImageFiles}
            faceBlur={fileUpload.faceBlur}
            setFaceBlur={fileUpload.setFaceBlur}
            onFileChange={fileUpload.handleFileChange}
          />
        )}

        {canManageFiles && (
          <DonationFileLibrary
            files={fileUpload.files}
            loadingFiles={fileUpload.loadingFiles}
            filesToUpload={fileUpload.filesToUpload}
            uploading={fileUpload.uploading}
            uploadProgress={fileUpload.uploadProgress}
            hasImageFiles={fileUpload.hasImageFiles}
            faceBlur={fileUpload.faceBlur}
            setFaceBlur={fileUpload.setFaceBlur}
            deletingFile={fileUpload.deletingFile}
            confirmDeletePath={fileUpload.confirmDeletePath}
            setConfirmDeletePath={fileUpload.setConfirmDeletePath}
            onFileChange={fileUpload.handleFileChange}
            onDeleteFile={handleDeleteFile}
            onUploadOnly={handleUploadOnly}
            onClose={onClose}
            fileInputRef={fileUpload.fileInputRef}
          />
        )}

        <div className="mb-6 space-y-4">
          <DonationInfoPanel donation={donation} />
          <DonationHistorySection statusHistory={statusHistory} />
        </div>
      </form>
    </AdminBaseModal>
  )
}
