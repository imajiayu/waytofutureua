// ============================================
// 捐赠状态工具库
// 单一数据源：所有状态定义、分组、转换规则
// ============================================

// ============================================
// 1. 状态定义
// ============================================

export const DONATION_STATUSES = [
  'pending', 'widget_load_failed',
  'processing', 'fraud_check',
  'paid', 'confirmed', 'delivering', 'completed',
  'expired', 'declined', 'failed',
  'refunding', 'refund_processing', 'refunded',
] as const

export type DonationStatus = typeof DONATION_STATUSES[number]

// ============================================
// 2. 状态分组
// ============================================

/** 支付前状态 */
export const PRE_PAYMENT_STATUSES: readonly DonationStatus[] = [
  'pending', 'widget_load_failed'
] as const

/** 处理中状态 */
export const PROCESSING_STATUSES: readonly DonationStatus[] = [
  'processing', 'fraud_check'
] as const

/** 支付成功状态（计入项目进度） */
export const SUCCESS_STATUSES: readonly DonationStatus[] = [
  'paid', 'confirmed', 'delivering', 'completed'
] as const

/** 支付失败状态 */
export const FAILED_STATUSES: readonly DonationStatus[] = [
  'expired', 'declined', 'failed'
] as const

/** 退款相关状态 */
export const REFUND_STATUSES: readonly DonationStatus[] = [
  'refunding', 'refund_processing', 'refunded'
] as const

// ============================================
// 3. 状态转换规则
// ============================================

/** 管理员可执行的状态转换 */
export const ADMIN_STATUS_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  pending: [],
  widget_load_failed: [],
  processing: [],
  fraud_check: [],
  paid: ['confirmed'],
  confirmed: ['delivering'],
  delivering: ['completed'],
  completed: [],
  expired: [],
  declined: [],
  failed: [],
  refunding: [],
  refund_processing: [],
  refunded: [],
}

/** 支付 Webhook 可更新的源状态 */
export const PAYMENT_WEBHOOK_SOURCE_STATUSES: readonly DonationStatus[] = [
  'pending', 'processing', 'fraud_check', 'widget_load_failed'
] as const

/** 退款 Webhook 可更新的源状态 */
export const REFUND_WEBHOOK_SOURCE_STATUSES: readonly DonationStatus[] = [
  'paid', 'confirmed', 'delivering', 'refunding', 'refund_processing'
] as const

/** 可申请退款的状态 */
export const REFUNDABLE_STATUSES: readonly DonationStatus[] = [
  'paid', 'confirmed', 'delivering'
] as const

/** 不可退款的状态（已完成） */
export const NON_REFUNDABLE_COMPLETED: DonationStatus = 'completed'

/** 退款进行中状态（不可重复申请） */
export const REFUND_IN_PROGRESS_STATUSES: readonly DonationStatus[] = [
  'refunding', 'refund_processing', 'refunded'
] as const

/** 用于判断 DECLINED webhook 是否为退款被拒绝的状态 */
export const REFUND_DECLINED_CHECK_STATUSES: readonly DonationStatus[] = [
  ...SUCCESS_STATUSES,
  'refunding',
  'refund_processing'
] as const

// ============================================
// 4. UI 显示相关
// ============================================

/** 状态颜色映射 - 14 个状态各有独立视觉标识 */
export const STATUS_COLORS: Record<DonationStatus, { bg: string; text: string }> = {
  // ── 支付前 ──
  pending:             { bg: 'bg-ukraine-gold-100', text: 'text-ukraine-gold-800' },  // 金色 = 等待支付
  widget_load_failed:  { bg: 'bg-stone-100',        text: 'text-stone-500' },          // 石灰 = 技术问题

  // ── 处理中 ──
  processing:          { bg: 'bg-ukraine-blue-100',  text: 'text-ukraine-blue-700' },  // 蓝色 = 系统处理
  fraud_check:         { bg: 'bg-indigo-100',        text: 'text-indigo-700' },         // 靛蓝 = 安全审查

  // ── 成功进度 ── 每个阶段独立色相
  paid:                { bg: 'bg-teal-50',           text: 'text-teal-700' },           // 青绿 = 已收款
  confirmed:           { bg: 'bg-emerald-100',       text: 'text-emerald-700' },        // 翠绿 = 已确认
  delivering:          { bg: 'bg-sky-100',           text: 'text-sky-700' },            // 天蓝 = 配送中
  completed:           { bg: 'bg-life-200',          text: 'text-life-800' },           // 深绿 = 已完成

  // ── 失败 ── 严重程度递增
  expired:             { bg: 'bg-zinc-100',          text: 'text-zinc-500' },           // 冷灰 = 已过期
  declined:            { bg: 'bg-warm-100',          text: 'text-warm-700' },           // 暖橙 = 被拒绝
  failed:              { bg: 'bg-rose-100',          text: 'text-rose-700' },           // 玫红 = 失败

  // ── 退款 ── 独立色系，不与失败混淆
  refunding:           { bg: 'bg-amber-100',         text: 'text-amber-700' },          // 琥珀 = 申请退款
  refund_processing:   { bg: 'bg-violet-100',        text: 'text-violet-700' },         // 紫罗兰 = 退款处理中
  refunded:            { bg: 'bg-slate-100',         text: 'text-slate-600' },          // 板岩 = 已退款
}

/** 主流程状态（用于进度显示） */
export const MAIN_FLOW_STATUSES: readonly DonationStatus[] = [
  'paid', 'confirmed', 'delivering', 'completed'
] as const

/** 显示用的流程状态（包含 pending） */
export const DISPLAY_FLOW_STATUSES: readonly DonationStatus[] = [
  'pending', 'paid', 'confirmed', 'delivering', 'completed'
] as const

// ============================================
// 5. 状态判断辅助函数
// ============================================

/** 是否为预支付状态 */
export function isPrePaymentStatus(status: DonationStatus): boolean {
  return PRE_PAYMENT_STATUSES.includes(status)
}

/** 是否为失败状态 */
export function isFailedStatus(status: DonationStatus): boolean {
  return FAILED_STATUSES.includes(status)
}

/** 是否为退款相关状态 */
export function isRefundStatus(status: DonationStatus): boolean {
  return REFUND_STATUSES.includes(status)
}

/** 是否可以申请退款 */
export function canRequestRefund(status: DonationStatus): boolean {
  return REFUNDABLE_STATUSES.includes(status)
}

/** 是否为退款进行中（不可重复申请） */
export function isRefundInProgress(status: DonationStatus): boolean {
  return REFUND_IN_PROGRESS_STATUSES.includes(status)
}

/** 是否为退款待处理（refunding 或 refund_processing，不含已完成的 refunded） */
export function isRefundPending(status: DonationStatus): boolean {
  return status === 'refunding' || status === 'refund_processing'
}

/** 是否可以查看结果图片（仅 completed） */
export function canViewResult(status: DonationStatus): boolean {
  return status === 'completed'
}

/** 是否可以管理文件（仅 completed） */
export function canManageFiles(status: DonationStatus): boolean {
  return status === 'completed'
}

/** 是否支持批量编辑（delivering 不支持，需要上传文件） */
export function canBatchEdit(status: DonationStatus): boolean {
  return status !== 'delivering' &&
         ADMIN_STATUS_TRANSITIONS[status]?.length > 0
}

/** 获取管理员允许的下一个状态 */
export function getNextAllowedStatuses(status: DonationStatus): DonationStatus[] {
  return ADMIN_STATUS_TRANSITIONS[status] || []
}

/** 检查状态转换是否合法（管理员） */
export function isValidAdminTransition(from: DonationStatus, to: DonationStatus): boolean {
  return ADMIN_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/** 是否需要上传文件（delivering → completed） */
export function needsFileUpload(from: DonationStatus, to: DonationStatus): boolean {
  return from === 'delivering' && to === 'completed'
}

/** 状态转换是否需要文件上传（因此不能批量编辑） */
export function requiresFileUploadToTransition(status: DonationStatus): boolean {
  // 目前只有 delivering → completed 需要文件上传
  const nextStatuses = ADMIN_STATUS_TRANSITIONS[status] || []
  return nextStatuses.length > 0 && nextStatuses.some(to => needsFileUpload(status, to))
}

// ============================================
// 6. 成功页状态分组
// ============================================

export type StatusGroup = 'failed' | 'processing' | 'success'

/** 获取状态所属的分组（用于成功页显示） */
export function getStatusGroup(status: DonationStatus): StatusGroup {
  if (FAILED_STATUSES.includes(status) || status === 'widget_load_failed') {
    return 'failed'
  }
  if (PRE_PAYMENT_STATUSES.includes(status) || PROCESSING_STATUSES.includes(status)) {
    return 'processing'
  }
  return 'success'
}

// ============================================
// 7. Webhook 辅助函数
// ============================================

/** 是否为退款类型的 Webhook */
export function isRefundWebhook(wayforpayStatus: string): boolean {
  return ['Refunded', 'RefundInProcessing', 'Voided'].includes(wayforpayStatus)
}

/** 获取 Webhook 可更新的源状态 */
export function getWebhookSourceStatuses(isRefund: boolean): readonly DonationStatus[] {
  return isRefund ? REFUND_WEBHOOK_SOURCE_STATUSES : PAYMENT_WEBHOOK_SOURCE_STATUSES
}


