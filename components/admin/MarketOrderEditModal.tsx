'use client'

import { useState } from 'react'

import { updateMarketOrderStatus } from '@/app/actions/market-admin'
import { useMarketOrderFileUpload } from '@/lib/hooks/useMarketOrderFileUpload'
import { getTranslatedText } from '@/lib/i18n-utils'
import { MARKET_ORDER_CATEGORY_LABELS } from '@/lib/market/market-categories'
import {
  canManageOrderFiles,
  getFileCategory,
  getNextOrderStatuses,
  needsFileUpload,
  needsTrackingNumber,
} from '@/lib/market/market-status'
import type { AdminMarketOrder, MarketOrderStatus } from '@/types/market'

import AdminBaseModal from './AdminBaseModal'
import MarketOrderFileLibrary from './market-order/MarketOrderFileLibrary'
import MarketOrderInfoPanel from './market-order/MarketOrderInfoPanel'
import MarketOrderStatusSection from './market-order/MarketOrderStatusSection'
import MarketOrderTransitionUpload from './market-order/MarketOrderTransitionUpload'

interface Props {
  order: AdminMarketOrder
  onClose: () => void
  onSaved: () => void
}

export default function MarketOrderEditModal({ order, onClose, onSaved }: Props) {
  const [newStatus, setNewStatus] = useState<MarketOrderStatus | ''>('')
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number || '')
  const [trackingCarrier, setTrackingCarrier] = useState(order.tracking_carrier || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const fileUpload = useMarketOrderFileUpload({
    orderId: order.id,
    autoLoad: canManageFiles,
  })

  const displayError = error || fileUpload.validationError || ''

  const handleSelectStatus = (status: MarketOrderStatus) => {
    setNewStatus(status)
    fileUpload.clearTransitionFiles()
    setError('')
    fileUpload.setValidationError(null)
  }

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

      if (showFileUpload && selectedCategory) {
        if (fileUpload.transitionFiles.length === 0) {
          setError(
            `Please upload at least one ${MARKET_ORDER_CATEGORY_LABELS[selectedCategory]} file`
          )
          setLoading(false)
          return
        }
        const hasImage = fileUpload.transitionFiles.some((f) => f.type.startsWith('image/'))
        if (!hasImage) {
          setError('At least one image file is required. Videos alone are not sufficient.')
          setLoading(false)
          return
        }

        try {
          await fileUpload.runBatchUpload(fileUpload.transitionFiles, selectedCategory)
        } catch (err: unknown) {
          throw new Error(
            `File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

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

  const handleUploadOnly = async () => {
    const errMsg = await fileUpload.handleUploadOnly()
    if (errMsg) setError(errMsg)
    else setError('')
  }

  const handleDeleteFile = async (path: string) => {
    const errMsg = await fileUpload.handleDeleteFile(path)
    if (errMsg) setError(errMsg)
  }

  return (
    <AdminBaseModal
      title={`Order: ${order.order_reference}`}
      onClose={onClose}
      error={displayError}
    >
      <form onSubmit={handleSubmit}>
        <MarketOrderInfoPanel order={order} itemTitle={itemTitle} />

        {canUpdate && (
          <MarketOrderStatusSection
            nextStatuses={nextStatuses}
            newStatus={newStatus}
            onSelectStatus={handleSelectStatus}
            showTrackingInput={!!showTrackingInput}
            trackingNumber={trackingNumber}
            setTrackingNumber={setTrackingNumber}
            trackingCarrier={trackingCarrier}
            setTrackingCarrier={setTrackingCarrier}
            loading={loading}
            uploading={fileUpload.uploading}
            onClose={onClose}
          />
        )}

        {showFileUpload && selectedCategory && (
          <MarketOrderTransitionUpload
            category={selectedCategory}
            files={fileUpload.transitionFiles}
            uploading={fileUpload.uploading}
            uploadProgress={fileUpload.uploadProgress}
            onFileChange={fileUpload.handleTransitionFileChange}
          />
        )}

        {canManageFiles && (
          <MarketOrderFileLibrary
            files={fileUpload.files}
            loadingFiles={fileUpload.loadingFiles}
            mgmtFiles={fileUpload.mgmtFiles}
            mgmtCategory={fileUpload.mgmtCategory}
            setMgmtCategory={fileUpload.setMgmtCategory}
            uploading={fileUpload.uploading}
            uploadProgress={fileUpload.uploadProgress}
            deletingFile={fileUpload.deletingFile}
            confirmDeletePath={fileUpload.confirmDeletePath}
            setConfirmDeletePath={fileUpload.setConfirmDeletePath}
            onMgmtFileChange={fileUpload.handleMgmtFileChange}
            onUploadOnly={handleUploadOnly}
            onDeleteFile={handleDeleteFile}
            showCloseButton={!canUpdate}
            onClose={onClose}
            mgmtFileInputRef={fileUpload.mgmtFileInputRef}
          />
        )}
      </form>
    </AdminBaseModal>
  )
}
