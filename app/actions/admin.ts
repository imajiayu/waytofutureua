'use server'

import { getAdminClient, getUserClient } from '@/lib/supabase/action-clients'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import type { I18nText } from '@/types'
import sharp from 'sharp'
import { processImageWithCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary'
import {
  isValidAdminTransition,
  needsFileUpload,
  isFailedStatus,
  type DonationStatus
} from '@/lib/donation-status'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { createProjectSchema, updateProjectSchema } from '@/lib/validations'
import type { SupportedLocale } from '@/lib/i18n-utils'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectUpdate = Database['public']['Tables']['projects']['Update']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type Donation = Database['public']['Tables']['donations']['Row']

/**
 * 管理员登录
 */
export async function adminLogin(email: string, password: string) {
  const supabase = await getUserClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, user: data.user }
}

/**
 * 管理员登出
 */
export async function adminLogout() {
  const supabase = await getUserClient()
  await supabase.auth.signOut()
  return { success: true }
}

/**
 * 获取所有项目（管理员视图）
 */
export async function getAdminProjects() {
  const supabase = await getAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Project[]
}

/**
 * 创建项目
 */
export async function createProject(project: ProjectInsert) {
  const supabase = await getAdminClient()

  // 运行时验证已知字段，passthrough 放行 i18n 等额外字段
  let validated: ProjectInsert
  try {
    validated = createProjectSchema.parse(project) as ProjectInsert
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Validation failed: ${err.errors.map(e => e.message).join(', ')}`)
    }
    throw err
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(validated)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/admin/projects')
  revalidatePath('/[locale]', 'page')
  return data as Project
}

/**
 * 更新项目
 */
export async function updateProject(id: number, updates: ProjectUpdate) {
  const supabase = await getAdminClient()

  // 确保不修改这些字段
  const { id: _, created_at, updated_at, ...safeUpdates } = updates as Record<string, unknown>

  // 运行时验证已知字段，passthrough 放行 i18n 等额外字段
  let validated: ProjectUpdate
  try {
    validated = updateProjectSchema.passthrough().parse(safeUpdates) as ProjectUpdate
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(`Validation failed: ${err.errors.map(e => e.message).join(', ')}`)
    }
    throw err
  }

  const { data, error } = await supabase
    .from('projects')
    .update(validated)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/admin/projects')
  revalidatePath('/[locale]', 'page')
  return data as Project
}

/**
 * 获取所有捐赠（管理员视图）
 * 排序规则：
 * 1. failed 状态排在最后
 * 2. 其他状态按 donated_at 降序排序
 * 返回捐赠记录和状态历史
 */
export async function getAdminDonations() {
  const supabase = await getAdminClient()

  // 并行获取捐赠和状态历史
  const [donationsResult, historyResult] = await Promise.all([
    supabase
      .from('donations')
      .select(`
        *,
        projects (
          project_name,
          project_name_i18n
        )
      `),
    supabase
      .from('donation_status_history')
      .select('*')
      .order('changed_at', { ascending: true })
  ])

  if (donationsResult.error) throw donationsResult.error
  if (historyResult.error) throw historyResult.error

  const data = donationsResult.data
  const history = historyResult.data

  // 自定义排序：failed 状态排在最后，其他按 donated_at 降序
  const sorted = (data || []).sort((a, b) => {
    // 首先按状态排序：failed 排在最后
    const aFailed = isFailedStatus(a.donation_status as DonationStatus)
    const bFailed = isFailedStatus(b.donation_status as DonationStatus)
    if (aFailed && !bFailed) return 1
    if (!aFailed && bFailed) return -1

    // 如果状态相同（都是 failed 或都不是 failed），按 donated_at 降序排序
    const dateA = new Date(a.donated_at).getTime()
    const dateB = new Date(b.donated_at).getTime()
    return dateB - dateA
  })

  return {
    donations: sorted as (Donation & { projects: { project_name: string; project_name_i18n: I18nText } })[],
    history: history as Database['public']['Tables']['donation_status_history']['Row'][]
  }
}

/**
 * 更新捐赠状态
 */
export async function updateDonationStatus(
  id: number,
  newStatus: string,
  uploadedImageUrl?: string
) {
  const supabase = await getAdminClient()

  // 获取当前捐赠记录（包含更多信息用于发送邮件）
  const { data: current, error: fetchError } = await supabase
    .from('donations')
    .select('donation_status, donation_public_id, donor_email, donor_name, amount, locale, project_id')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // 验证状态转换
  // 管理员只能修改正常业务流程的状态，不能修改退款相关状态
  // 退款状态由 WayForPay API 自动处理
  const currentStatus = (current.donation_status || '') as DonationStatus

  if (!isValidAdminTransition(currentStatus, newStatus as DonationStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. Admin can only modify: paid→confirmed, confirmed→delivering, delivering→completed. Refund statuses are handled automatically.`
    )
  }

  // 如果是 delivering → completed，尝试获取结果图片用于邮件（非必须）
  let resultImageUrl: string | undefined
  if (needsFileUpload(currentStatus, newStatus as DonationStatus)) {
    if (uploadedImageUrl) {
      resultImageUrl = uploadedImageUrl
    } else {
      try {
        const { data: files } = await supabase.storage
          .from('donation-results')
          .list(current.donation_public_id, { limit: 100 })

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        const imageFile = files?.filter(f => f.name && !f.name.startsWith('.') && f.id)
          ?.find(f => imageExtensions.some(ext => f.name.toLowerCase().endsWith(ext)))

        if (imageFile) {
          const { data: { publicUrl } } = supabase.storage
            .from('donation-results')
            .getPublicUrl(`${current.donation_public_id}/${imageFile.name}`)
          resultImageUrl = publicUrl
        }
      } catch {
        // 获取图片失败不阻塞状态更新
      }
    }
  }

  // 更新状态
  const { data, error } = await supabase
    .from('donations')
    .update({ donation_status: newStatus })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // 如果是 delivering → completed，发送完成邮件
  if (needsFileUpload(currentStatus, newStatus as DonationStatus)) {
    try {
      // 获取项目的多语言信息
      const { data: project } = await supabase
        .from('projects')
        .select('project_name_i18n, location_i18n, unit_name_i18n')
        .eq('id', current.project_id)
        .single()

      if (project && current.donor_email) {
        const { sendDonationCompletedEmail } = await import('@/lib/email')

        await sendDonationCompletedEmail({
          to: current.donor_email,
          donorName: current.donor_name,
          projectNameI18n: project.project_name_i18n as { en: string; zh: string; ua: string },
          locationI18n: project.location_i18n as { en: string; zh: string; ua: string },
          unitNameI18n: project.unit_name_i18n as { en: string; zh: string; ua: string },
          donationIds: [current.donation_public_id],
          quantity: 1,
          totalAmount: current.amount,
          currency: 'UAH',
          locale: (current.locale || 'en') as SupportedLocale,
          resultImageUrl
        })

        logger.info('ADMIN', 'Donation completed email sent', {
          to: current.donor_email,
          donationId: current.donation_public_id,
        })
      }
    } catch (emailError) {
      logger.error('ADMIN', 'Failed to send completion email', {
        donationId: current.donation_public_id,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      })
    }
  }

  revalidatePath('/admin/donations')
  return data as Donation
}

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
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
  }
  const fileExt = mimeToExt[file.type]
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
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(300, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: 80 })
          .toBuffer()

        const thumbnailFileName = `${timestamp}_thumb.jpg`
        const thumbnailPath = `${donation.donation_public_id}/.thumbnails/${thumbnailFileName}`

        await supabase.storage
          .from('donation-results')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          })

        logger.debug('ADMIN', 'Thumbnail created', { fileName: thumbnailFileName })
      } catch (thumbnailError) {
        logger.error('ADMIN', 'Failed to generate thumbnail', {
          error: thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError),
        })
      }

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
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(300, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: 80 })
          .toBuffer()

        const thumbnailFileName = `${timestamp}_thumb.jpg`
        const thumbnailPath = `${donation.donation_public_id}/.thumbnails/${thumbnailFileName}`

        await supabase.storage
          .from('donation-results')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          })
      } catch (thumbnailError) {
        logger.error('ADMIN', 'Failed to generate thumbnail', {
          error: thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError),
        })
      }
    }
  } else {
    // 非图片文件（视频）、人脸打码已关闭、或 Cloudinary 未配置，直接上传原始文件
    if (!isImage) {
      logger.debug('MEDIA', 'Uploading video file directly', { fileName: file.name })
    } else if (!faceBlur) {
      logger.info('MEDIA', 'Face blur disabled by admin, uploading original image', { fileName: file.name })
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
      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(300, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: 80 })
          .toBuffer()

        const thumbnailFileName = `${timestamp}_thumb.jpg`
        const thumbnailPath = `${donation.donation_public_id}/.thumbnails/${thumbnailFileName}`

        await supabase.storage
          .from('donation-results')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          })

        logger.debug('ADMIN', 'Thumbnail created', { fileName: thumbnailFileName })
      } catch (thumbnailError) {
        logger.error('ADMIN', 'Failed to generate thumbnail', {
          error: thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError),
        })
      }
    }
  }

  // 获取公开 URL（使用最终的文件路径）
  const finalFilePath = isImage && isCloudinaryConfigured()
    ? `${donation.donation_public_id}/${finalFileName}`
    : filePath

  const {
    data: { publicUrl },
  } = supabase.storage.from('donation-results').getPublicUrl(finalFilePath)

  return {
    publicUrl,
    filePath: finalFilePath,
    donationPublicId: donation.donation_public_id
  }
}

/**
 * 为大文件（视频）创建签名上传 URL，让客户端直接上传到 Supabase Storage
 * 绕过 Vercel Serverless 4.5MB 请求体限制
 */
export async function createSignedUploadUrl(donationId: number, fileType: string) {
  const supabase = await getAdminClient()

  // 验证文件类型
  const mimeToExt: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    // 图片和视频统一走签名 URL 直传
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  }
  const fileExt = mimeToExt[fileType]
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
      try {
        const thumbnailBuffer = await sharp(processedBuffer)
          .resize(300, null, { withoutEnlargement: true, fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer()

        await supabase.storage
          .from('donation-results')
          .upload(`${donationPublicId}/.thumbnails/${timestamp}_thumb.jpg`, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          })
      } catch (thumbErr) {
        logger.error('ADMIN', 'Thumbnail generation failed', {
          error: thumbErr instanceof Error ? thumbErr.message : String(thumbErr),
        })
      }
    } catch (cloudinaryError) {
      // Cloudinary 失败，保留原图，仍然生成缩略图
      logger.error('ADMIN', 'Cloudinary processing failed, keeping original', {
        error: cloudinaryError instanceof Error ? cloudinaryError.message : String(cloudinaryError),
      })

      try {
        const thumbnailBuffer = await sharp(buffer)
          .resize(300, null, { withoutEnlargement: true, fit: 'inside' })
          .jpeg({ quality: 80 })
          .toBuffer()

        await supabase.storage
          .from('donation-results')
          .upload(`${donationPublicId}/.thumbnails/${timestamp}_thumb.jpg`, thumbnailBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          })
      } catch (thumbErr) {
        logger.error('ADMIN', 'Thumbnail generation failed', {
          error: thumbErr instanceof Error ? thumbErr.message : String(thumbErr),
        })
      }
    }
  } else {
    // 不需要 Cloudinary，只生成缩略图
    try {
      const thumbnailBuffer = await sharp(buffer)
        .resize(300, null, { withoutEnlargement: true, fit: 'inside' })
        .jpeg({ quality: 80 })
        .toBuffer()

      await supabase.storage
        .from('donation-results')
        .upload(`${donationPublicId}/.thumbnails/${timestamp}_thumb.jpg`, thumbnailBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        })
    } catch (thumbErr) {
      logger.error('ADMIN', 'Thumbnail generation failed', {
        error: thumbErr instanceof Error ? thumbErr.message : String(thumbErr),
      })
    }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('donation-results')
    .getPublicUrl(finalFilePath)

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
      sortBy: { column: 'created_at', order: 'desc' }
    })

  if (listError) {
    throw new Error(`Failed to list files: ${listError.message}`)
  }

  // 过滤掉 .thumbnails 文件夹和其他隐藏文件/文件夹
  const actualFiles = (files || []).filter(file =>
    file.name &&
    !file.name.startsWith('.') &&
    file.id // 文件有 id，文件夹没有
  )

  // 为每个文件生成公开 URL
  const filesWithUrls = actualFiles.map(file => {
    const filePath = `${donation.donation_public_id}/${file.name}`
    const { data: { publicUrl } } = supabase.storage
      .from('donation-results')
      .getPublicUrl(filePath)

    return {
      name: file.name,
      path: filePath,
      publicUrl,
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || '',
      createdAt: file.created_at,
      updatedAt: file.updated_at
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

/**
 * 批量更新捐赠状态
 */
export async function batchUpdateDonationStatus(
  donationIds: number[],
  newStatus: string
) {
  const supabase = await getAdminClient()

  if (donationIds.length === 0) {
    throw new Error('No donations selected')
  }

  // 获取所有选中的捐赠
  const { data: donations, error: fetchError } = await supabase
    .from('donations')
    .select('id, donation_status, donation_public_id')
    .in('id', donationIds)

  if (fetchError) throw fetchError

  if (!donations || donations.length === 0) {
    throw new Error('No donations found')
  }

  // 验证所有捐赠的状态是否相同
  const statuses = new Set(donations.map(d => d.donation_status))
  if (statuses.size !== 1) {
    throw new Error('All selected donations must have the same status')
  }

  const currentStatus = (donations[0].donation_status || '') as DonationStatus

  // delivering → completed 不支持批量更新（需要上传文件）
  if (needsFileUpload(currentStatus, newStatus as DonationStatus)) {
    throw new Error('Batch update from delivering to completed is not supported. Please update donations individually to upload result files.')
  }

  // 验证状态转换
  if (!isValidAdminTransition(currentStatus, newStatus as DonationStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. Admin can only modify: paid→confirmed, confirmed→delivering, delivering→completed. Refund statuses are handled automatically.`
    )
  }

  // 批量更新状态
  const { data, error } = await supabase
    .from('donations')
    .update({ donation_status: newStatus })
    .in('id', donationIds)
    .select()

  if (error) throw error

  revalidatePath('/admin/donations')
  return data as Donation[]
}

