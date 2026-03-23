'use server'

import { getInternalClient } from '@/lib/supabase/action-clients'
import { canViewResult, type DonationStatus } from '@/lib/donation-status'
import { logger } from '@/lib/logger'

/**
 * Get the public URL for a donation result image
 * Returns the first image found in the donation's folder
 */
export async function getDonationResultUrl(donationPublicId: string) {
  try {
    const supabase = getInternalClient()

    if (!donationPublicId || donationPublicId.trim() === '') {
      return { error: 'invalidDonationId' }
    }

    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select('donation_status')
      .eq('donation_public_id', donationPublicId)
      .single()

    if (donationError || !donation) {
      return { error: 'donationNotFound' }
    }

    if (!canViewResult(donation.donation_status as DonationStatus)) {
      logger.debug('STORAGE', 'Result not viewable', {
        donationId: donationPublicId,
        status: donation.donation_status,
      })
      return { error: 'notCompleted' }
    }

    const { data: files, error: storageError } = await supabase.storage
      .from('donation-results')
      .list(donationPublicId, {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (storageError) {
      logger.error('STORAGE', 'Failed to list donation result files', {
        donationId: donationPublicId,
        error: storageError.message,
      })
      return { error: 'storageFailed' }
    }

    if (!files || files.length === 0) {
      return { error: 'noImage' }
    }

    const filePath = `${donationPublicId}/${files[0].name}`
    const { data: urlData } = supabase.storage.from('donation-results').getPublicUrl(filePath)

    if (!urlData || !urlData.publicUrl) {
      return { error: 'urlFailed' }
    }

    return {
      url: urlData.publicUrl,
      fileName: files[0].name,
    }
  } catch (error) {
    logger.errorWithStack('STORAGE', 'getDonationResultUrl failed', error, {
      donationId: donationPublicId,
    })
    return { error: 'serverError' }
  }
}

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
      .from('donation-results')
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

    const originalFiles = files.filter((file) => file.name !== '.thumbnails')

    const { data: thumbnailFiles } = await supabase.storage
      .from('donation-results')
      .list(`${donationPublicId}/.thumbnails`, {
        sortBy: { column: 'name', order: 'asc' },
      })

    const fileObjects = originalFiles.map((file, index) => {
      const filePath = `${donationPublicId}/${file.name}`
      const {
        data: { publicUrl },
      } = supabase.storage.from('donation-results').getPublicUrl(filePath)

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
          } = supabase.storage.from('donation-results').getPublicUrl(thumbnailPath)
          thumbnailUrl = thumbUrl
        }
      }

      const isImage =
        file.metadata?.mimetype?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
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
