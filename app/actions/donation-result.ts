'use server'

import { canViewResult, type DonationStatus } from '@/lib/donation-status'
import { logger } from '@/lib/logger'
import { getInternalClient } from '@/lib/supabase/action-clients'
import { STORAGE_BUCKETS } from '@/lib/supabase/storage-buckets'

/**
 * Get all donation result files with their thumbnails
 * Returns array of files with original and thumbnail URLs
 */
export async function getAllDonationResultFiles(donationPublicId: string) {
  try {
    const supabase = getInternalClient()

    if (!donationPublicId || donationPublicId.trim() === '') {
      return { error: 'invalidDonationId', files: [] }
    }

    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select('donation_status')
      .eq('donation_public_id', donationPublicId)
      .single()

    if (donationError || !donation) {
      return { error: 'donationNotFound', files: [] }
    }

    if (!canViewResult(donation.donation_status as DonationStatus)) {
      logger.debug('STORAGE', 'Result files not viewable', {
        donationId: donationPublicId,
        status: donation.donation_status,
      })
      return { error: 'notCompleted', files: [] }
    }

    const { data: files, error: storageError } = await supabase.storage
      .from(STORAGE_BUCKETS.donationResults)
      .list(donationPublicId, {
        sortBy: { column: 'name', order: 'asc' },
      })

    if (storageError) {
      logger.error('STORAGE', 'Failed to list all donation result files', {
        donationId: donationPublicId,
        error: storageError.message,
      })
      return { error: 'storageFailed', files: [] }
    }

    if (!files || files.length === 0) {
      return { error: 'noImage', files: [] }
    }

    // 过滤掉 .thumbnails 文件夹和其他隐藏文件（如 .emptyFolderPlaceholder）
    const originalFiles = files.filter((file) => file.name && !file.name.startsWith('.'))

    const { data: thumbnailFiles } = await supabase.storage
      .from(STORAGE_BUCKETS.donationResults)
      .list(`${donationPublicId}/.thumbnails`, {
        sortBy: { column: 'name', order: 'asc' },
      })

    const fileObjects = originalFiles.map((file, index) => {
      const filePath = `${donationPublicId}/${file.name}`
      const {
        data: { publicUrl },
      } = supabase.storage.from(STORAGE_BUCKETS.donationResults).getPublicUrl(filePath)

      const fileTimestamp = file.name.split('.')[0]
      let thumbnailUrl = null

      if (thumbnailFiles && thumbnailFiles.length > 0) {
        let matchingThumb = thumbnailFiles.find((thumb) =>
          thumb.name.startsWith(fileTimestamp + '_thumb.')
        )

        if (!matchingThumb && index < thumbnailFiles.length) {
          matchingThumb = thumbnailFiles[index]
        }

        if (!matchingThumb && thumbnailFiles.length === 1 && originalFiles.length === 1) {
          matchingThumb = thumbnailFiles[0]
        }

        if (matchingThumb) {
          const thumbnailPath = `${donationPublicId}/.thumbnails/${matchingThumb.name}`
          const {
            data: { publicUrl: thumbUrl },
          } = supabase.storage.from(STORAGE_BUCKETS.donationResults).getPublicUrl(thumbnailPath)
          thumbnailUrl = thumbUrl
        }
      }

      const isImage =
        file.metadata?.mimetype?.startsWith('image/') ||
        /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
      const isVideo =
        file.metadata?.mimetype?.startsWith('video/') || /\.(mp4|mov)$/i.test(file.name)

      return {
        name: file.name,
        originalUrl: publicUrl,
        thumbnailUrl,
        isImage,
        isVideo,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || '',
      }
    })

    return {
      files: fileObjects,
      error: null,
    }
  } catch (error) {
    logger.errorWithStack('STORAGE', 'getAllDonationResultFiles failed', error, {
      donationId: donationPublicId,
    })
    return {
      error: 'serverError',
      files: [],
    }
  }
}
