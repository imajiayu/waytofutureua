import crypto from 'crypto'

import { BASE_URL } from '@/lib/constants'
import { logger } from '@/lib/logger'

if (!process.env.WAYFORPAY_MERCHANT_ACCOUNT) {
  throw new Error('WAYFORPAY_MERCHANT_ACCOUNT is not set')
}

if (!process.env.WAYFORPAY_SECRET_KEY) {
  throw new Error('WAYFORPAY_SECRET_KEY is not set')
}

export const WAYFORPAY_MERCHANT_ACCOUNT = process.env.WAYFORPAY_MERCHANT_ACCOUNT
export const WAYFORPAY_SECRET_KEY = process.env.WAYFORPAY_SECRET_KEY
export const WAYFORPAY_MERCHANT_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || BASE_URL

/**
 * Generate WayForPay signature using HMAC-MD5
 * @param values Array of values to sign (order matters!)
 * @returns HMAC-MD5 signature
 */
export function generateSignature(values: (string | number)[]): string {
  const signString = values.join(';')
  // WayForPay requires HMAC-MD5 with SecretKey, not plain MD5
  return crypto.createHmac('md5', WAYFORPAY_SECRET_KEY).update(signString).digest('hex')
}

/**
 * WayForPay Payment Parameters
 */
export interface WayForPayPaymentParams {
  merchantAccount: string
  merchantAuthType: 'SimpleSignature'
  merchantDomainName: string
  merchantSignature: string
  orderReference: string
  orderDate: number
  amount: number
  currency: 'UAH' | 'USD' | 'EUR'
  productName: string[]
  productPrice: number[]
  productCount: number[]
  clientFirstName: string
  clientLastName: string
  clientEmail: string
  clientPhone?: string
  language: 'UA' | 'EN' | 'RU'
  returnUrl: string
  serviceUrl: string
}

/**
 * Create WayForPay payment parameters
 */
export function createWayForPayPayment({
  orderReference,
  amount,
  currency = 'UAH',
  productName,
  productPrice,
  productCount,
  clientFirstName,
  clientLastName,
  clientEmail,
  clientPhone,
  language = 'UA',
  returnUrl,
  serviceUrl,
}: {
  orderReference: string
  amount: number
  currency?: 'UAH' | 'USD' | 'EUR'
  productName: string[]
  productPrice: number[]
  productCount: number[]
  clientFirstName: string
  clientLastName: string
  clientEmail: string
  clientPhone?: string
  language?: 'UA' | 'EN' | 'RU'
  returnUrl: string
  serviceUrl: string
}): WayForPayPaymentParams {
  const orderDate = Math.floor(Date.now() / 1000)

  // Generate signature
  // Order: merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;productName;productCount;productPrice
  const signatureValues = [
    WAYFORPAY_MERCHANT_ACCOUNT,
    WAYFORPAY_MERCHANT_DOMAIN,
    orderReference,
    orderDate,
    amount,
    currency,
    ...productName,
    ...productCount,
    ...productPrice,
  ]

  const merchantSignature = generateSignature(signatureValues)

  return {
    merchantAccount: WAYFORPAY_MERCHANT_ACCOUNT,
    merchantAuthType: 'SimpleSignature',
    merchantDomainName: WAYFORPAY_MERCHANT_DOMAIN,
    merchantSignature,
    orderReference,
    orderDate,
    amount,
    currency,
    productName,
    productPrice,
    productCount,
    clientFirstName,
    clientLastName,
    clientEmail,
    clientPhone,
    language,
    returnUrl,
    serviceUrl,
  }
}

/**
 * Verify WayForPay callback signature
 */
export function verifyWayForPaySignature(
  data: Record<string, any>,
  receivedSignature: string
): boolean {
  // Signature fields order for payment notification:
  // merchantAccount;orderReference;amount;currency;authCode;cardPan;transactionStatus;reasonCode
  const signatureValues = [
    data.merchantAccount,
    data.orderReference,
    data.amount,
    data.currency,
    data.authCode || '',
    data.cardPan || '',
    data.transactionStatus,
    data.reasonCode || '',
  ]

  const calculatedSignature = generateSignature(signatureValues)
  const a = Buffer.from(calculatedSignature, 'utf-8')
  const b = Buffer.from(receivedSignature, 'utf-8')
  if (a.length !== b.length) {
    // Dummy constant-time comparison to prevent timing leakage on length mismatch
    crypto.timingSafeEqual(a, Buffer.alloc(a.length))
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

/**
 * WayForPay Transaction Status Values
 *
 * Complete list based on official documentation:
 * @see https://wiki.wayforpay.com/en/view/852131
 * @see docs/PAYMENT_WORKFLOW.md
 *
 * Status Categories:
 * - Success: APPROVED
 * - Processing: IN_PROCESSING, WAITING_AUTH_COMPLETE, PENDING
 * - Failed: DECLINED, EXPIRED
 * - Refund: REFUND_IN_PROCESSING, REFUNDED, VOIDED
 */
export const WAYFORPAY_STATUS = {
  // Success
  APPROVED: 'Approved', // Payment successful, funds withdrawn from card

  // Processing
  IN_PROCESSING: 'inProcessing', // Under processing, awaiting payment gate completion
  WAITING_AUTH_COMPLETE: 'WaitingAuthComplete', // Successful hold (pre-authorization)
  PENDING: 'Pending', // Under anti-fraud verification

  // Failed
  DECLINED: 'Declined', // Operation cannot be completed (bank declined)
  EXPIRED: 'Expired', // Payment term has elapsed

  // Refund
  REFUND_IN_PROCESSING: 'RefundInProcessing', // Refund awaiting sufficient merchant balance
  REFUNDED: 'Refunded', // Refund completed
  VOIDED: 'Voided', // Asset un-holding completed (pre-auth cancellation)
} as const

/**
 * Generate WayForPay webhook response signature
 * Required to confirm webhook receipt and stop WayForPay retries
 * Signature format: orderReference;status;time
 */
export function generateWebhookResponseSignature(
  orderReference: string,
  status: 'accept' | 'decline',
  time: number
): string {
  const signatureValues = [orderReference, status, time]
  return generateSignature(signatureValues)
}

/**
 * WayForPay Refund Request Parameters
 */
export interface WayForPayRefundParams {
  transactionType: 'REFUND'
  merchantAccount: string
  orderReference: string
  amount: number
  currency: 'UAH' | 'USD' | 'EUR'
  comment: string
  apiVersion: number
  merchantSignature: string
}

/**
 * WayForPay Refund Response
 */
export interface WayForPayRefundResponse {
  merchantAccount: string
  orderReference: string
  transactionStatus: 'Refunded' | 'Voided' | 'Declined' | 'RefundInProcessing'
  reason?: string
  reasonCode: number
  merchantSignature?: string
}

/**
 * Create WayForPay refund request
 * @see https://wiki.wayforpay.com/en/view/852115
 */
export function createWayForPayRefund({
  orderReference,
  amount,
  currency = 'UAH',
  comment,
}: {
  orderReference: string
  amount: number
  currency?: 'UAH' | 'USD' | 'EUR'
  comment: string
}): WayForPayRefundParams {
  // Generate signature
  // Order: merchantAccount;orderReference;amount;currency
  const signatureValues = [WAYFORPAY_MERCHANT_ACCOUNT, orderReference, amount, currency]

  const merchantSignature = generateSignature(signatureValues)

  return {
    transactionType: 'REFUND',
    merchantAccount: WAYFORPAY_MERCHANT_ACCOUNT,
    orderReference,
    amount,
    currency,
    comment,
    apiVersion: 1,
    merchantSignature,
  }
}

/**
 * Verify WayForPay refund response signature
 */
export function verifyRefundResponseSignature(
  data: WayForPayRefundResponse,
  receivedSignature: string
): boolean {
  // Signature fields order for refund response:
  // merchantAccount;orderReference;transactionStatus;reasonCode
  const signatureValues = [
    data.merchantAccount,
    data.orderReference,
    data.transactionStatus,
    data.reasonCode,
  ]

  const calculatedSignature = generateSignature(signatureValues)
  const a = Buffer.from(calculatedSignature, 'utf-8')
  const b = Buffer.from(receivedSignature, 'utf-8')
  if (a.length !== b.length) {
    // Dummy constant-time comparison to prevent timing leakage on length mismatch
    crypto.timingSafeEqual(a, Buffer.alloc(a.length))
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

/**
 * Call WayForPay API to process refund
 * @returns Promise with refund response
 */
export async function processWayForPayRefund({
  orderReference,
  amount,
  currency = 'UAH',
  comment,
}: {
  orderReference: string
  amount: number
  currency?: 'UAH' | 'USD' | 'EUR'
  comment: string
}): Promise<WayForPayRefundResponse> {
  const refundParams = createWayForPayRefund({
    orderReference,
    amount,
    currency,
    comment,
  })

  // Log request (hide signature for security)
  logger.info('PAYMENT:WAYFORPAY', 'Refund API request', {
    orderReference: refundParams.orderReference,
    amount: refundParams.amount,
    currency: refundParams.currency,
  })

  const response = await fetch('https://api.wayforpay.com/api', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(refundParams),
  })

  if (!response.ok) {
    logger.error('PAYMENT:WAYFORPAY', 'Refund HTTP error', {
      status: response.status,
      statusText: response.statusText,
      orderReference,
    })
    throw new Error(`WayForPay API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as WayForPayRefundResponse

  // Log response (hide signature for security)
  logger.info('PAYMENT:WAYFORPAY', 'Refund API response', {
    orderReference: data.orderReference,
    transactionStatus: data.transactionStatus,
    reasonCode: data.reasonCode,
  })

  // Verify response signature if provided
  if (data.merchantSignature) {
    const isValid = verifyRefundResponseSignature(data, data.merchantSignature)
    if (!isValid) {
      logger.error('PAYMENT:WAYFORPAY', 'Refund signature invalid', {
        orderReference: data.orderReference,
        transactionStatus: data.transactionStatus,
      })
      throw new Error('Invalid refund response signature')
    }
    logger.debug('PAYMENT:WAYFORPAY', 'Refund signature verified')
  }

  return data
}
