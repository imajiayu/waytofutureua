/**
 * EPay (易支付) v2 API Type Definitions
 *
 * A payment protocol deployed independently by several vendors (Ezfp, QmmPay, …).
 * Paths, parameter names and signing are identical across them; only the domain
 * and merchant credentials differ — see `providers.ts` for the active instance.
 *
 * API base: resolved from `EPAY_API_BASE` in providers.ts
 * Protocol: application/x-www-form-urlencoded requests, JSON responses
 * Signature: RSA SHA256WithRSA (merchant private key signs, platform public key verifies)
 * Webhook: GET request to notify_url (NOT POST like WayForPay/NOWPayments)
 */

// ── Create Order ────────────────────────────────────────────────

export interface EPayCreateResponse {
  code: number // 0 = success
  msg?: string
  trade_no?: string // Platform order number
  pay_type?: 'jump' | 'qrcode' | 'html' | 'scan' | string
  pay_info?: string // Payment URL (jump) or QR code content (qrcode)
  timestamp?: string
  sign?: string
  sign_type?: string
}

// ── Webhook Callback (GET query string) ─────────────────────────

export interface EPayWebhookParams {
  pid: string
  trade_no: string // Platform order number
  out_trade_no: string // Merchant order number = orderReference
  api_trade_no: string // WeChat/Alipay native order number
  type: string // Payment type: alipay / wxpay
  trade_status: string // Fixed: TRADE_SUCCESS
  addtime: string
  endtime?: string
  name: string
  money: string
  param?: string
  buyer?: string // Payer identifier (openid)
  timestamp: string
  sign: string
  sign_type: string
}

// ── Refund ──────────────────────────────────────────────────────

export interface EPayRefundResponse {
  code: number // 0 = success (synchronous, no webhook)
  msg?: string
  refund_no?: string // Platform refund number
  out_refund_no?: string
  trade_no?: string
  money?: string
  reducemoney?: string // Amount deducted from merchant balance
}

// ── Order Query ─────────────────────────────────────────────────

/** Payment status returned by the order-query endpoint. */
export const EPAY_ORDER_STATUS = {
  UNPAID: 0,
  PAID: 1,
  REFUNDED: 2,
  FROZEN: 3,
  PRE_AUTH: 4,
} as const

export interface EPayQueryResponse {
  code: number // 0 = success
  msg?: string
  trade_no?: string // Platform order number
  out_trade_no?: string // Merchant order number = orderReference
  api_trade_no?: string // WeChat/Alipay native order number
  type?: string // alipay / wxpay
  status?: number // 0 unpaid, 1 paid, 2 refunded, 3 frozen, 4 pre-auth
  pid?: number
  addtime?: string
  endtime?: string
  name?: string
  money?: string // Original order amount in CNY (what was charged)
  refundmoney?: string // Amount already refunded; only present for partial refunds
  param?: string
  buyer?: string
  clientip?: string
  timestamp?: string
  sign?: string
  sign_type?: string
}

// ── Frontend Payment Data (returned from Server Action) ─────────

export interface EPayPaymentData {
  orderReference: string
  payType: 'jump' | 'qrcode' | 'html' | string
  payInfo: string // Redirect URL (method='jump' always returns a jump URL)
  amountCny: number
  amountUsd: number
}
