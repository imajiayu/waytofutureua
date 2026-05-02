'use server'

import { revalidatePath } from 'next/cache'

import {
  type DonationStatus,
  isFailedStatus,
  isValidAdminTransition,
  needsFileUpload,
} from '@/lib/donation-status'
import { logger } from '@/lib/logger'
import { getAdminClient } from '@/lib/supabase/action-clients'
import { STORAGE_BUCKETS } from '@/lib/supabase/storage-buckets'
import type { AppLocale, Donation } from '@/types'
import type { Database } from '@/types/database'
import type { AdminDonationListItem } from '@/types/dtos'

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
    supabase.from('donations').select(`
        *,
        projects (
          project_name,
          project_name_i18n
        )
      `),
    supabase.from('donation_status_history').select('*').order('changed_at', { ascending: true }),
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
    donations: sorted as AdminDonationListItem[],
    history: history as Database['public']['Tables']['donation_status_history']['Row'][],
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
    .select(
      'donation_status, donation_public_id, donor_email, donor_name, amount, locale, project_id'
    )
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
          .from(STORAGE_BUCKETS.donationResults)
          .list(current.donation_public_id, { limit: 100 })

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
        const imageFile = files
          ?.filter((f) => f.name && !f.name.startsWith('.') && f.id)
          ?.find((f) => imageExtensions.some((ext) => f.name.toLowerCase().endsWith(ext)))

        if (imageFile) {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from(STORAGE_BUCKETS.donationResults)
            .getPublicUrl(`${current.donation_public_id}/${imageFile.name}`)
          resultImageUrl = publicUrl
        }
      } catch {
        // 获取图片失败不阻塞状态更新
      }
    }
  }

  // 更新状态（乐观锁：确保状态未被并发修改）
  const { data, error } = await supabase
    .from('donations')
    .update({ donation_status: newStatus })
    .eq('id', id)
    .eq('donation_status', currentStatus)
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
          locale: (current.locale || 'en') as AppLocale,
          resultImageUrl,
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
 * 批量更新捐赠状态
 */
export async function batchUpdateDonationStatus(donationIds: number[], newStatus: string) {
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
  const statuses = new Set(donations.map((d) => d.donation_status))
  if (statuses.size !== 1) {
    throw new Error('All selected donations must have the same status')
  }

  const currentStatus = (donations[0].donation_status || '') as DonationStatus

  // delivering → completed 不支持批量更新（需要上传文件）
  if (needsFileUpload(currentStatus, newStatus as DonationStatus)) {
    throw new Error(
      'Batch update from delivering to completed is not supported. Please update donations individually to upload result files.'
    )
  }

  // 验证状态转换
  if (!isValidAdminTransition(currentStatus, newStatus as DonationStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} → ${newStatus}. Admin can only modify: paid→confirmed, confirmed→delivering, delivering→completed. Refund statuses are handled automatically.`
    )
  }

  // 批量更新状态（乐观锁：确保状态未被并发修改）
  const { data, error } = await supabase
    .from('donations')
    .update({ donation_status: newStatus })
    .in('id', donationIds)
    .eq('donation_status', currentStatus)
    .select()

  if (error) throw error

  revalidatePath('/admin/donations')
  return data as Donation[]
}
