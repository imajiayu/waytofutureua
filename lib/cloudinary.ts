/**
 * Cloudinary 图像处理工具
 * 功能：
 * 1. 压缩图片到合适大小（保持高质量）
 * 2. 人脸检测和打码
 */

import { v2 as cloudinary } from 'cloudinary'

import { logger } from '@/lib/logger'

// 确保 Cloudinary 配置（延迟配置，确保环境变量已加载）
function ensureCloudinaryConfig() {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

/**
 * 带重试机制的 fetch 函数
 * 用于处理 Cloudinary 转换延迟和网络不稳定问题
 */
interface FetchRetryOptions {
  maxRetries: number
  initialDelay: number
  backoffMultiplier: number
  timeout?: number
}

async function fetchWithRetry(url: string, options: FetchRetryOptions): Promise<Buffer> {
  const { maxRetries, initialDelay, backoffMultiplier, timeout = 30000 } = options
  let lastError: Error | null = null
  let currentDelay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.debug('MEDIA:CLOUDINARY', 'Fetching transformed image', {
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      // @ts-ignore - 临时存储 contentType
      buffer._contentType = contentType

      logger.debug('MEDIA:CLOUDINARY', 'Fetch successful', { bytes: buffer.length })

      return buffer
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn('MEDIA:CLOUDINARY', 'Fetch attempt failed', {
        attempt: attempt + 1,
        error: lastError.message,
      })

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, currentDelay))
        currentDelay *= backoffMultiplier
      }
    }
  }

  throw new Error(
    `Failed to fetch transformed image after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
  )
}

interface ProcessImageOptions {
  buffer: Buffer
  fileName: string
  folder?: string
}

interface ProcessedImage {
  optimizedBuffer: Buffer
  originalSize: number
  processedSize: number
  format: string
}

/**
 * 处理图片：压缩 + 人脸打码
 *
 * 流程：
 * 1. 上传原图到 Cloudinary
 * 2. 应用转换：
 *    - 人脸打码（pixelate_faces）
 *    - 智能质量压缩（q_auto:good - 保持高质量）
 *    - 自动格式选择（f_auto - 自动选择最优格式）
 *    - 尺寸限制（最大 1920px 宽，保持宽高比）
 * 3. 下载处理后的图片
 * 4. 删除 Cloudinary 临时文件
 */
export async function processImageWithCloudinary(
  options: ProcessImageOptions
): Promise<ProcessedImage> {
  const { buffer, fileName, folder = 'temp-ngo-donations' } = options

  ensureCloudinaryConfig()

  const originalSize = buffer.length

  try {
    // 步骤 1: 上传到 Cloudinary（临时存储）
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(buffer)
    })

    logger.info('MEDIA:CLOUDINARY', 'Image uploaded', {
      publicId: uploadResult.public_id,
      bytes: uploadResult.bytes,
    })

    // 步骤 2: 生成转换后的图片 URL
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        { effect: 'pixelate_faces:20' },
        { width: 1920, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto', flags: 'lossy' },
      ],
    })

    // 步骤 3: 下载转换后的图片（带重试机制）
    const optimizedBuffer = await fetchWithRetry(transformedUrl, {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
    })
    const processedSize = optimizedBuffer.length

    logger.info('MEDIA:CLOUDINARY', 'Image processed', {
      originalBytes: originalSize,
      processedBytes: processedSize,
      reduction: `${((1 - processedSize / originalSize) * 100).toFixed(1)}%`,
    })

    // 步骤 4: 删除 Cloudinary 临时文件（清理）
    try {
      await cloudinary.uploader.destroy(uploadResult.public_id)
    } catch (cleanupError) {
      logger.warn('MEDIA:CLOUDINARY', 'Failed to delete temp file', {
        publicId: uploadResult.public_id,
        error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
      })
    }

    // @ts-ignore
    const contentType = (optimizedBuffer as any)._contentType || 'image/jpeg'
    const format = contentType.split('/')[1]?.split(';')[0] || 'jpg'

    return {
      optimizedBuffer,
      originalSize,
      processedSize,
      format,
    }
  } catch (error) {
    logger.error('MEDIA:CLOUDINARY', 'Processing failed', {
      fileName,
      error: error instanceof Error ? error.message : String(error),
    })
    logger.warn('MEDIA:CLOUDINARY', 'Falling back to direct compression')

    // 降级策略：使用 sharp 进行简单压缩（无人脸检测）
    try {
      const sharp = require('sharp')

      const compressed = await sharp(buffer)
        .resize(1920, undefined, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer()

      logger.info('MEDIA:CLOUDINARY', 'Fallback compression successful', {
        originalBytes: originalSize,
        processedBytes: compressed.length,
        reduction: `${((1 - compressed.length / originalSize) * 100).toFixed(1)}%`,
      })

      return {
        optimizedBuffer: compressed,
        originalSize,
        processedSize: compressed.length,
        format: 'jpg',
      }
    } catch (fallbackError) {
      logger.error('MEDIA:CLOUDINARY', 'Fallback compression failed', {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      })
      logger.warn('MEDIA:CLOUDINARY', 'Using original image without processing')
      return {
        optimizedBuffer: buffer,
        originalSize,
        processedSize: originalSize,
        format: fileName.split('.').pop() || 'jpg',
      }
    }
  }
}

/**
 * 检查 Cloudinary 配置是否正确
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}
