/**
 * NOWPayments API Types
 * @see https://documenter.getpostman.com/view/7907941/2s93JusNJt
 */

/**
 * NOWPayments Payment Status Values
 * @see https://nowpayments.zendesk.com/hc/en-us/articles/18395434917149-Payment-statuses
 */
export const NOWPAYMENTS_STATUS = {
  // Initial
  WAITING: 'waiting', // Waiting for customer to send payment

  // Processing (blockchain)
  CONFIRMING: 'confirming', // Transaction being processed on blockchain
  CONFIRMED: 'confirmed', // Blockchain confirmed, waiting to send to wallet
  SENDING: 'sending', // Funds being sent to merchant wallet

  // Completed
  FINISHED: 'finished', // Payment completed, funds received
  PARTIALLY_PAID: 'partially_paid', // User paid less than required (funds received)

  // Failed
  FAILED: 'failed', // Payment failed
  EXPIRED: 'expired', // 7 days passed without payment
  REFUNDED: 'refunded', // Funds refunded

  // Special cases
  WRONG_ASSET_CONFIRMED: 'wrong_asset_confirmed', // Wrong coin/network sent
  CANCELLED: 'cancelled', // Manually cancelled
} as const

export type NowPaymentsStatus = (typeof NOWPAYMENTS_STATUS)[keyof typeof NOWPAYMENTS_STATUS]

/**
 * Create Payment Request
 * POST https://api.nowpayments.io/v1/payment
 */
export interface CreatePaymentRequest {
  price_amount: number // Amount in price_currency
  price_currency: string // e.g., 'usd'
  pay_currency?: string // e.g., 'usdttrc20' (optional, user can choose)
  ipn_callback_url: string // Webhook URL
  order_id: string // Our order reference
  order_description?: string // Description
  success_url?: string // Redirect after success
  cancel_url?: string // Redirect after cancel
  partially_paid_url?: string // Redirect after partial payment
  is_fixed_rate?: boolean // Lock exchange rate
  is_fee_paid_by_user?: boolean // User pays network fee
}

/**
 * Create Payment Response
 */
export interface CreatePaymentResponse {
  payment_id: string
  payment_status: NowPaymentsStatus
  pay_address: string // Wallet address to send crypto
  price_amount: number
  price_currency: string
  pay_amount: number // Amount in crypto
  amount_received: number
  pay_currency: string
  order_id: string
  order_description: string
  ipn_callback_url: string
  created_at: string
  updated_at: string
  purchase_id: string
  smart_contract?: string
  network?: string
  network_precision?: number
  time_limit?: number
  burning_percent?: number
  expiration_estimate_date?: string
  is_fixed_rate?: boolean
  is_fee_paid_by_user?: boolean
  valid_until?: string
  type?: string
  // QR code URL for easy scanning
  payin_extra_id?: string
}

/**
 * IPN (Webhook) Callback Body
 * Sent when payment status changes
 */
export interface NowPaymentsWebhookBody {
  payment_id: number | string
  payment_status: NowPaymentsStatus
  pay_address: string
  price_amount: number
  price_currency: string
  pay_amount: number
  actually_paid: number // Actual amount received
  actually_paid_at_fiat?: number // Actual amount in fiat
  pay_currency: string
  order_id: string // Our order reference
  order_description?: string
  purchase_id: string
  outcome_amount?: number
  outcome_currency?: string
  created_at: string
  updated_at: string
  payin_extra_id?: string
  smart_contract?: string
  network?: string
  burning_percent?: number
  fee?: {
    currency: string
    depositFee: number
    withdrawalFee: number
    serviceFee: number
  }
}

/**
 * Full Currency Info
 * GET https://api.nowpayments.io/v1/full-currencies
 */
export interface FullCurrencyInfo {
  id: number
  code: string // e.g., "USDTTRC20"
  name: string // e.g., "Tether (TRC20)"
  logo_url: string // e.g., "/images/coins/usdttrc20.svg"
  network: string // e.g., "trx", "eth", "bsc"
  is_popular: boolean
  is_stable: boolean
  available_for_payment: boolean
  available_for_payout: boolean
  ticker: string // e.g., "usdt"
  precision: number
}

/**
 * API Error Response
 */
export interface NowPaymentsError {
  statusCode: number
  code: string
  message: string
}
