'use server'

import { isCloudinaryConfigured, processImageWithCloudinary } from '@/lib/cloudinary'
import { MIME_TO_EXT } from '@/lib/file-validation'
import { logger } from '@/lib/logger'
import { getAdminClient } from '@/lib/supabase/action-clients'

import { generateAndUploadThumbnail } from './_helpers'

/**
 * 上传捐赠结果文件（通过 FormData）
 * 文件存储在 donation-results/{donation_public_id}/{filename}
 */
export async function uploadDonationResultFile(formData: FormData) {
  const supabase = await getAdminClient()

  const donationIdStr = formData.get('donationId') as string
  const file = formData.get('file') as File
  const faceBlur = formData.get('faceBlur') !== '0' // 默认开启

  if (!file || !donationIdStr) {
    throw new Error('Missing file or donation ID')
  }

  const donationId = parseInt(donationIdStr, 10)
  if (isNaN(donationId)) {
    throw new Error('Invalid donation ID')
  }

  // 获取捐赠的 donation_public_id
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .select('donation_public_id')
    .eq('id', donationId)
    .single()

  if (donationError || !donation) {
    throw new Error('Donation not found')
  }

  // 验证文件类型并从 MIME 类型反查扩展名（避免双扩展名攻击）
  const fileExt = MIME_TO_EXT[file.type]
  if (!fileExt) {
    throw new Error('Invalid file type')
  }

  // 验证文件大小（最大 50MB）
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File too large (max 50MB)')
  }

  // 生成文件路径：{donation_public_id}/{timestamp}.{ext}
  const timestamp = Date.now()
  const fileName = `${timestamp}.${fileExt}`
  const filePath = `${donation.donation_public_id}/${fileName}`

  // 读取文件内容
  const arrayBuffer = await file.arrayBuffer()
  let buffer: Buffer = Buffer.from(arrayBuffer) as Buffer
  let contentType = file.type
  let finalFileName = fileName

  // 判断是否为图片
  const isImage = file.type.startsWith('image/')

  // 如果是图片且 Cloudinary 已配置且开启了人脸打码，使用 Cloudinary 处理（压缩 + 人脸打码）
  if (isImage && faceBlur && isCloudinaryConfigured()) {
    try {
      logger.info('ADMIN', 'Processing image with Cloudinary', { fileName: file.name })

      const processed = await processImageWithCloudinary({
        buffer,
        fileName: file.name,
        folder: 'ngo-donation-results',
      })

      // 使用处理后的图片
      buffer = processed.optimizedBuffer as Buffer

      // 更新文件名（使用处理后的格式）
      finalFileName = `${timestamp}.${processed.format}`
      const finalFilePath = `${donation.donation_public_id}/${finalFileName}`

      // 更新 content type
      contentType = `image/${processed.format}`

      logger.info('ADMIN', 'Cloudinary processing complete', {
        fileName: file.name,
        originalBytes: processed.originalSize,
        processedBytes: processed.processedSize,
        reduction: `${((1 - processed.processedSize / processed.originalSize) * 100).toFixed(1)}%`,
      })

      // 上传处理后的文件到 Supabase
      const { error: uploadError } = await supabase.storage
        .from('donation-results')
        .upload(finalFilePath, buffer, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // 使用处理后的图片生成缩略图
      await generateAndUploadThumbnail({
        supabase,
        sourceBuffer: buffer,
        donationPublicId: donation.donation_public_id,
        timestamp: String(timestamp),
      })
    } catch (cloudinaryError) {
      // Cloudinary 处理失败，回退到直接上传原图
      logger.error('ADMIN', 'Cloudinary processing failed, uploading original', {
        error: cloudinaryError instanceof Error ? cloudinaryError.message : String(cloudinaryError),
      })

      const { error: uploadError } = await supabase.storage
        .from('donation-results')
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // 尝试生成缩略图
      await generateAndUploadThumbnail({
        supabase,
        sourceBuffer: buffer,
        donationPublicId: donation.donation_public_id,
        timestamp: String(timestamp),
      })
    }
  } else {
    // 非图片文件（视频）、人脸打码已关闭、或 Cloudinary 未配置，直接上传原始文件
    if (!isImage) {
      logger.debug('MEDIA', 'Uploading video file directly', { fileName: file.name })
    } else if (!faceBlur) {
      logger.info('MEDIA', 'Face blur disabled by admin, uploading original image', {
        fileName: file.name,
      })
    } else {
      logger.warn('MEDIA', 'Cloudinary not configured, uploading original image')
    }

    const { error: uploadError } = await supabase.storage
      .from('donation-results')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // 如果是图片，生成缩略图
    if (isImage) {
      await generateAndUploadThumbnail({
        supabase,
        sourceBuffer: buffer,
        donationPublicId: donation.donation_public_id,
        timestamp: String(timestamp),
      })
    }
  }

  // 获取公开 URL（使用最终的文件路径）
  const finalFilePath =
    isImage && isCloudinaryConfigured()
      ? `${donation.donation_public_id}/${finalFileName}`
      : filePath

  const {
    data: { publicUrl },
  } = supabase.storage.from('donation-results').getPublicUrl(finalFilePath)

  return {
    publicUrl,
    filePath: finalFilePath,
    donationPublicId: donation.donation_public_id,
  }
}

/**
 * 为大文件（视频）创建签名上传 URL，让客户端直接上传到 Supabase Storage
 * 绕过 Vercel Serverless 4.5MB 请求体限制
 */
export async function createSignedUploadUrl(donationId: number, fileType: string) {
  const supabase = await getAdminClient()

  // 验证文件类型（图片和视频统一走签名 URL 直传）
  const fileExt = MIME_TO_EXT[fileType]
  if (!fileExt) {
    throw new Error('Invalid file type')
  }

  // 获取捐赠的 donation_public_id
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .select('donation_public_id')
    .eq('id', donationId)
    .single()

  if (donationError || !donation) {
    throw new Error('Donation not found')
  }

  // 生成文件路径
  const timestamp = Date.now()
  const fileName = `${timestamp}.${fileExt}`
  const filePath = `${donation.donation_public_id}/${fileName}`

  // 创建签名上传 URL
  const { data, error } = await supabase.storage
    .from('donation-results')
    .createSignedUploadUrl(filePath)

  if (error || !data) {
    throw new Error(`Failed to create upload URL: ${error?.message}`)
  }

  return {
    path: data.path,
    token: data.token,
  }
}

/**
 * 对已上传到 Storage 的图片进行后处理（Cloudinary 人脸打码 + 缩略图生成）
 * 图片已通过签名 URL 直传到 Storage，此函数从 Storage 下载后处理再覆盖上传
 */
export async function processUploadedImage(
  donationId: number,
  filePath: string,
  faceBlur: boolean
): Promise<{ publicUrl: string }> {
  const supabase = await getAdminClient()

  // 从 Storage 下载已上传的原图
  const { data: blob, error: downloadError } = await supabase.storage
    .from('donation-results')
    .download(filePath)

  if (downloadError || !blob) {
    throw new Error(`Failed to download image for processing: ${downloadError?.message}`)
  }

  const buffer = Buffer.from(await blob.arrayBuffer())
  const fileName = filePath.split('/').pop() || 'unknown'
  const donationPublicId = filePath.split('/')[0]
  const timestamp = fileName.split('.')[0]
  let finalFilePath = filePath

  // Cloudinary 人脸打码处理
  if (faceBlur && isCloudinaryConfigured()) {
    try {
      logger.info('ADMIN', 'Processing uploaded image with Cloudinary', { filePath })

      const processed = await processImageWithCloudinary({
        buffer,
        fileName,
        folder: 'ngo-donation-results',
      })

      const processedBuffer = processed.optimizedBuffer as Buffer
      const newFileName = `${timestamp}.${processed.format}`
      const newFilePath = `${donationPublicId}/${newFileName}`
      const contentType = `image/${processed.format}`

      logger.info('ADMIN', 'Cloudinary processing complete', {
        filePath,
        originalBytes: processed.originalSize,
        processedBytes: processed.processedSize,
        reduction: `${((1 - processed.processedSize / processed.originalSize) * 100).toFixed(1)}%`,
      })

      // 上传处理后的文件
      const { error: uploadError } = await supabase.storage
        .from('donation-results')
        .upload(newFilePath, processedBuffer, {
          contentType,
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Failed to upload processed image: ${uploadError.message}`)
      }

      // 如果格式变了（路径不同），删除原始文件
      if (newFilePath !== filePath) {
        await supabase.storage.from('donation-results').remove([filePath])
      }

      finalFilePath = newFilePath

      // 用处理后的图片生成缩略图
      await generateAndUploadThumbnail({
        supabase,
        sourceBuffer: processedBuffer,
        donationPublicId,
        timestamp,
        upsert: true,
      })
    } catch (cloudinaryError) {
      // Cloudinary 失败，保留原图，仍然生成缩略图
      logger.error('ADMIN', 'Cloudinary processing failed, keeping original', {
        error: cloudinaryError instanceof Error ? cloudinaryError.message : String(cloudinaryError),
      })

      await generateAndUploadThumbnail({
        supabase,
        sourceBuffer: buffer,
        donationPublicId,
        timestamp,
        upsert: true,
      })
    }
  } else {
    // 不需要 Cloudinary，只生成缩略图
    await generateAndUploadThumbnail({
      supabase,
      sourceBuffer: buffer,
      donationPublicId,
      timestamp,
      upsert: true,
    })
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('donation-results').getPublicUrl(finalFilePath)

  return { publicUrl }
}

/**
 * 获取捐赠的所有结果文件
 */
export async function getDonationResultFiles(donationId: number) {
  const supabase = await getAdminClient()

  // 获取捐赠的 donation_public_id
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .select('donation_public_id')
    .eq('id', donationId)
    .single()

  if (donationError || !donation) {
    throw new Error('Donation not found')
  }

  // 列出文件夹中的所有文件
  const { data: files, error: listError } = await supabase.storage
    .from('donation-results')
    .list(donation.donation_public_id, {
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (listError) {
    throw new Error(`Failed to list files: ${listError.message}`)
  }

  // 过滤掉 .thumbnails 文件夹和其他隐藏文件/文件夹
  const actualFiles = (files || []).filter(
    (file) => file.name && !file.name.startsWith('.') && file.id // 文件有 id，文件夹没有
  )

  // 为每个文件生成公开 URL
  const filesWithUrls = actualFiles.map((file) => {
    const filePath = `${donation.donation_public_id}/${file.name}`
    const {
      data: { publicUrl },
    } = supabase.storage.from('donation-results').getPublicUrl(filePath)

    return {
      name: file.name,
      path: filePath,
      publicUrl,
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || '',
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }
  })

  return filesWithUrls
}

/**
 * 删除捐赠结果文件（同时删除缩略图）
 */
export async function deleteDonationResultFile(donationId: number, filePath: string) {
  const supabase = await getAdminClient()

  // 获取捐赠的 donation_public_id 以验证文件路径
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .select('donation_public_id')
    .eq('id', donationId)
    .single()

  if (donationError || !donation) {
    throw new Error('Donation not found')
  }

  // 验证文件路径是否属于该捐赠
  if (!filePath.startsWith(`${donation.donation_public_id}/`)) {
    throw new Error('Invalid file path')
  }

  // 准备要删除的文件列表
  const filesToDelete = [filePath]

  // 如果是图片文件，尝试删除对应的缩略图
  const fileName = filePath.split('/').pop() || ''
  const isImageFile = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

  if (isImageFile) {
    // 从文件名提取时间戳（假设格式为 {timestamp}.{ext}）
    const timestamp = fileName.split('.')[0]
    const thumbnailPath = `${donation.donation_public_id}/.thumbnails/${timestamp}_thumb.jpg`
    filesToDelete.push(thumbnailPath)
  }

  // 批量删除文件（原始文件 + 缩略图）
  const { error: deleteError } = await supabase.storage
    .from('donation-results')
    .remove(filesToDelete)

  if (deleteError) {
    throw new Error(`Failed to delete file: ${deleteError.message}`)
  }

  return { success: true, deletedFiles: filesToDelete }
}
