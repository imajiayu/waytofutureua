// ============================================
// 支付方式工具库
// 单一数据源：donations.payment_method 的全部取值与判断函数
// ============================================
//
// 与 `lib/donation-status.ts`（只管 donation_status）分开：payment_method 是
// 另一列，语义上与状态无关。数据库侧 `payment_method` 是无 CHECK 约束的
// varchar(50)，取值约定只由这里和 RLS 策略共同维护。

import { type EPayProvider, isKnownEPayProvider } from './payment/epay/providers'

/**
 * 线上支付网关写入的标签。由各 webhook 分支精确字符串比较消费。
 *
 * 易支付系（微信/支付宝）记的是**具体服务商实例名**而非笼统的 'EPay'：
 * 退款要靠它判断这笔钱在哪家平台、该用哪套密钥。2026-09 QmmPay 停运后，
 * 正是这个值让那批历史记录仍可被识别和区别对待。详见 `payment/epay/providers.ts`。
 */
export type OnlinePaymentMethod = 'WayForPay' | 'NOWPayments' | EPayProvider

/**
 * admin 手动录入的线下捐赠（银行转账、现金、当面交付）。
 *
 * 线下捐赠没有支付网关订单，无法在线退款——`requestRefund` 据此提前返回，
 * 追踪页据此隐藏退款按钮。数据库侧由 "Admins can insert offline donations"
 * 策略强制同一取值。
 */
export const OFFLINE_PAYMENT_METHOD = 'Offline'

export type PaymentMethodLabel = OnlinePaymentMethod | typeof OFFLINE_PAYMENT_METHOD

/** 该笔捐赠是否为线下录入（无支付网关订单，不可在线退款） */
export function isOfflineDonation(paymentMethod: string | null | undefined): boolean {
  return paymentMethod === OFFLINE_PAYMENT_METHOD
}

/**
 * 该笔捐赠是否走易支付系（微信/支付宝）网关。
 *
 * 命中不代表可退款——还要看是不是**当前启用**的那家实例，
 * 用 `isRefundableByEPay()` 判断。
 */
export function isEPayDonation(
  paymentMethod: string | null | undefined
): paymentMethod is EPayProvider {
  return isKnownEPayProvider(paymentMethod)
}
