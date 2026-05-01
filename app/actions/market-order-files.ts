'use server'

import { MIME_TO_EXT } from '@/lib/file-validation'
import { logger } from '@/lib/logger'
import { getAdminClient, getInternalClient } from '@/lib/supabase/action-clients'
import { createServerClient } from '@/lib/supabase/server'
import type { MarketOrderFile, MarketOrderFileCategory, MarketOrderStatus } from '@/types/market'

const BUCKET = 'market-order-results'
const CATEGORIES: MarketOrderFileCategory[] = ['shipping', 'completion']

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// P3-1: Magic bytes 验证 — 防止 MIME 类型伪造
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF (+ WEBP at offset 8)
  'video/mp4': [
    [0x00, 0x00, 0x00],
    [0x66, 0x74, 0x79, 0x70],
  ], // ftyp at offset 4
  'video/quicktime': [[0x00, 0x00, 0x00]], // same box header
}

function verifyMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType]
  if (!signatures) return false

  const bytes = new Uint8Array(buffer.slice(0, 12))

  // For video/mp4, check 'ftyp' at offset 4
  if (mimeType === 'video/mp4') {
    return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  }

  // For quicktime, same ftyp check
  if (mimeType === 'video/quicktime') {
    return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  }

  // For images, check starting bytes
  return signatures.some((sig) => sig.every((byte, i) => bytes[i] === byte))
}

// ============================================
// 辅助：获取订单的 order_reference
// ============================================

async function getOrderReference(
  client: Awaited<ReturnType<typeof getAdminClient>>,
  orderId: number
): Promise<string> {
  const { data, error } = await client
    .from('market_orders')
    .select('order_reference')
    .eq('id', orderId)
    .single()

  if (error || !data) throw new Error('Order not found')
  return data.order_reference
}

// ============================================
// 1. 上传文件（通过 FormData）
// ============================================

export async function uploadMarketOrderFile(formData: FormData): Promise<{
  publicUrl: string
  filePath: string
  orderReference: string
}> {
  const client = await getAdminClient()

  const orderIdStr = formData.get('orderId') as string
  const file = formData.get('file') as File
  const category = formData.get('category') as MarketOrderFileCategory

  if (!file || !orderIdStr || !category) {
    throw new Error('Missing file, order ID, or category')
  }

  if (!CATEGORIES.includes(category)) {
    throw new Error('Invalid category')
  }

  const orderId = parseInt(orderIdStr, 10)
  if (isNaN(orderId)) throw new Error('Invalid order ID')

  // 验证 MIME 类型
  const fileExt = MIME_TO_EXT[file.type]
  if (!fileExt) throw new Error('Invalid file type')

  // 验证文件大小
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large (max 50MB)')

  // 读取文件内容
  const arrayBuffer = await file.arrayBuffer()

  // P3-1: Magic bytes 验证 — 确保文件内容与声明的 MIME 类型一致
  if (!verifyMagicBytes(arrayBuffer, file.type)) {
    throw new Error('File content does not match declared type')
  }

  const orderReference = await getOrderReference(client, orderId)

  // 生成文件路径：{order_reference}/{category}/{timestamp}.{ext}
  const timestamp = Date.now()
  const fileName = `${timestamp}.${fileExt}`
  const filePath = `${orderReference}/${category}/${fileName}`

  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await client.storage.from(BUCKET).upload(filePath, buffer, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  logger.info('MARKET:FILES', 'File uploaded', {
    orderId,
    category,
    fileName,
    size: file.size,
  })

  const {
    data: { publicUrl },
  } = client.storage.from(BUCKET).getPublicUrl(filePath)

  return { publicUrl, filePath, orderReference }
}

// ============================================
// 2. 创建签名上传 URL（大文件/视频）
// ============================================

export async function createMarketOrderSignedUploadUrl(
  orderId: number,
  fileType: string,
  category: MarketOrderFileCategory
): Promise<{ path: string; token: string }> {
  const client = await getAdminClient()

  if (!CATEGORIES.includes(category)) throw new Error('Invalid category')

  const fileExt = MIME_TO_EXT[fileType]
  if (!fileExt) throw new Error('Invalid file type')

  const orderReference = await getOrderReference(client, orderId)

  const timestamp = Date.now()
  const fileName = `${timestamp}.${fileExt}`
  const filePath = `${orderReference}/${category}/${fileName}`

  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(filePath)

  if (error || !data) {
    throw new Error(`Failed to create upload URL: ${error?.message}`)
  }

  return { path: data.path, token: data.token }
}

// ============================================
// 3. 列出订单文件
// ============================================

export async function getMarketOrderFiles(
  orderId: number,
  category?: MarketOrderFileCategory
): Promise<MarketOrderFile[]> {
  const client = await getAdminClient()
  const orderReference = await getOrderReference(client, orderId)

  const categoriesToList = category ? [category] : CATEGORIES
  const allFiles: MarketOrderFile[] = []

  for (const cat of categoriesToList) {
    const folderPath = `${orderReference}/${cat}`

    const { data: files, error } = await client.storage.from(BUCKET).list(folderPath, {
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      logger.error('MARKET:FILES', `Failed to list ${cat} files`, {
        orderId,
        error: error.message,
      })
      continue
    }

    const actualFiles = (files || []).filter((f) => f.name && !f.name.startsWith('.') && f.id)

    for (const file of actualFiles) {
      const path = `${folderPath}/${file.name}`
      const {
        data: { publicUrl },
      } = client.storage.from(BUCKET).getPublicUrl(path)

      allFiles.push({
        name: file.name,
        path,
        publicUrl,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || '',
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        category: cat,
      })
    }
  }

  return allFiles
}

// ============================================
// 4. 删除文件
// ============================================

export async function deleteMarketOrderFile(
  orderId: number,
  filePath: string
): Promise<{ success: boolean }> {
  const client = await getAdminClient()
  const orderReference = await getOrderReference(client, orderId)

  // 验证文件路径属于该订单（阻止 .. 路径遍历）
  if (filePath.includes('..') || !filePath.startsWith(`${orderReference}/`)) {
    throw new Error('Invalid file path')
  }

  const { error } = await client.storage.from(BUCKET).remove([filePath])

  if (error) throw new Error(`Failed to delete file: ${error.message}`)

  logger.info('MARKET:FILES', 'File deleted', { orderId, filePath })
  return { success: true }
}

// ============================================
// 5. 买家查询文件（验证身份）
// ============================================

export async function getOrderProofFiles(
  orderId: number
): Promise<{ files: MarketOrderFile[]; error?: string }> {
  const supabase = await createServerClient()

  // 验证认证身份
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { files: [], error: 'Not authenticated' }

  // 验证订单属于当前用户
  const { data: order, error: orderError } = await supabase
    .from('market_orders')
    .select('id, order_reference, status, buyer_id')
    .eq('id', orderId)
    .single()

  if (orderError || !order) return { files: [], error: 'Order not found' }
  if (order.buyer_id !== user.id) return { files: [], error: 'Unauthorized' }

  const status = order.status as MarketOrderStatus

  // 根据状态决定可见的文件分类
  let categoriesToShow: MarketOrderFileCategory[] = []
  if (status === 'shipped') {
    categoriesToShow = ['shipping']
  } else if (status === 'completed') {
    categoriesToShow = ['shipping', 'completion']
  } else {
    return { files: [] }
  }

  // 用 service client 读取 storage（storage 不走 RLS，身份已在上方验证）
  const adminClient = getInternalClient()
  const allFiles: MarketOrderFile[] = []

  for (const cat of categoriesToShow) {
    const folderPath = `${order.order_reference}/${cat}`

    const { data: files } = await adminClient.storage.from(BUCKET).list(folderPath, {
      sortBy: { column: 'created_at', order: 'desc' },
    })

    const actualFiles = (files || []).filter((f) => f.name && !f.name.startsWith('.') && f.id)

    for (const file of actualFiles) {
      const path = `${folderPath}/${file.name}`
      const {
        data: { publicUrl },
      } = adminClient.storage.from(BUCKET).getPublicUrl(path)

      allFiles.push({
        name: file.name,
        path,
        publicUrl,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || '',
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        category: cat,
      })
    }
  }

  return { files: allFiles }
}

/** 公开查询订单凭证文件（无需认证，用于公开购买记录） */
export async function getPublicOrderProofFiles(
  orderReference: string
): Promise<{ files: MarketOrderFile[] }> {
  // 路径遍历防护
  if (orderReference.includes('..') || orderReference.includes('/')) {
    return { files: [] }
  }

  const supabase = await createServerClient()

  // 从数据库获取真实状态，不信任客户端
  const { data: order } = await supabase
    .from('market_orders_public')
    .select('status')
    .eq('order_reference', orderReference)
    .single()

  if (!order?.status) return { files: [] }

  let categoriesToShow: MarketOrderFileCategory[] = []
  if (order.status === 'shipped') {
    categoriesToShow = ['shipping']
  } else if (order.status === 'completed') {
    categoriesToShow = ['shipping', 'completion']
  } else {
    return { files: [] }
  }

  const allFiles: MarketOrderFile[] = []

  for (const cat of categoriesToShow) {
    const folderPath = `${orderReference}/${cat}`

    const { data: files } = await supabase.storage.from(BUCKET).list(folderPath, {
      sortBy: { column: 'created_at', order: 'desc' },
    })

    const actualFiles = (files || []).filter((f) => f.name && !f.name.startsWith('.') && f.id)

    for (const file of actualFiles) {
      const path = `${folderPath}/${file.name}`
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)

      allFiles.push({
        name: file.name,
        path,
        publicUrl,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || '',
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        category: cat,
      })
    }
  }

  return { files: allFiles }
}
