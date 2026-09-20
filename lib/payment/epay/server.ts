import { logger } from '@/lib/logger'

import { attachSignature } from './crypto'
import { EPAY_API_BASE } from './providers'
import type {
  EPayCreateResponse,
  EPayPaymentData,
  EPayQueryResponse,
  EPayRefundResponse,
} from './types'
import { EPAY_ORDER_STATUS } from './types'

function getPid(): number {
  const pid = parseInt(process.env.EPAY_PID || '0', 10)
  if (!pid) throw new Error('EPAY_PID is not configured')
  return pid
}

function getRate(): number {
  const rate = parseFloat(process.env.NEXT_PUBLIC_EPAY_USD_CNY_RATE || '0')
  if (!rate) throw new Error('NEXT_PUBLIC_EPAY_USD_CNY_RATE is not configured')
  return rate
}

/** Convert USD to CNY string (2 decimal places, float-safe). */
export function usdToCny(usd: number): string {
  return (Math.round(usd * getRate() * 100) / 100).toFixed(2)
}

/** POST application/x-www-form-urlencoded and return parsed JSON. */
async function postForm(path: string, params: Record<string, string | number>) {
  const signed = attachSignature(params)
  const body = new URLSearchParams(Object.entries(signed).map(([k, v]) => [k, String(v)]))

  const res = await fetch(`${EPAY_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    throw new Error(`EPay HTTP error: ${res.status} ${res.statusText}`)
  }

  return res.json()
}

/**
 * Create an EPay payment order.
 *
 * Returns payType + payInfo for the frontend widget:
 *   - payType === 'jump'   → payInfo is a redirect URL
 *   - payType === 'qrcode' → payInfo is a QR code image URL or content
 */
export async function createEPayPayment(params: {
  orderReference: string
  totalAmountUsd: number
  name: string
  clientIp: string
  locale: string
  payType: 'alipay' | 'wxpay'
}): Promise<EPayPaymentData> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) throw new Error('NEXT_PUBLIC_APP_URL is not configured')

  const money = usdToCny(params.totalAmountUsd)
  const timestamp = String(Math.floor(Date.now() / 1000))

  const reqParams: Record<string, string | number> = {
    pid: getPid(),
    // 'jump' returns a single redirect URL; the platform's cashier page handles the
    // environment (WeChat-browser JSAPI, mobile H5, PC QR) so we don't have to
    // detect the device ourselves. 'web' would default to PC and hand back a QR
    // that mobile / in-WeChat users can't scan.
    method: 'jump',
    type: params.payType,
    out_trade_no: params.orderReference,
    notify_url: `${baseUrl}/api/webhooks/epay`,
    return_url: `${baseUrl}/${params.locale}/donate/success?order=${params.orderReference}`,
    name: params.name.substring(0, 127), // API truncates at 127 chars
    money,
    clientip: params.clientIp,
    timestamp,
  }

  logger.info('PAYMENT:EPAY', 'Creating payment order', {
    orderReference: params.orderReference,
    amountUsd: params.totalAmountUsd,
    amountCny: money,
    payType: params.payType,
  })

  const result = (await postForm('/create', reqParams)) as EPayCreateResponse

  if (result.code !== 0 || !result.pay_info) {
    logger.error('PAYMENT:EPAY', 'Create payment failed', {
      code: result.code,
      msg: result.msg,
      orderReference: params.orderReference,
    })
    throw new Error(`EPay error: ${result.msg || 'unknown error'}`)
  }

  logger.info('PAYMENT:EPAY', 'Payment order created', {
    orderReference: params.orderReference,
    platformTradeNo: result.trade_no,
    payType: result.pay_type,
  })

  return {
    orderReference: params.orderReference,
    payType: result.pay_type || 'jump',
    payInfo: result.pay_info,
    amountCny: parseFloat(money),
    amountUsd: params.totalAmountUsd,
  }
}

/**
 * Query an EPay order by merchant order reference.
 *
 * Returns the authoritative order record, including `money` (the original
 * CNY amount charged) and `refundmoney` (amount already refunded). Use this
 * instead of recomputing CNY from USD, since the USD→CNY rate may have
 * changed since payment time.
 */
export async function queryEPayOrder(orderReference: string): Promise<EPayQueryResponse> {
  const timestamp = String(Math.floor(Date.now() / 1000))

  const reqParams: Record<string, string | number> = {
    pid: getPid(),
    out_trade_no: orderReference,
    timestamp,
  }

  const result = (await postForm('/query', reqParams)) as EPayQueryResponse

  logger.info('PAYMENT:EPAY', 'Order query response', {
    orderReference,
    code: result.code,
    status: result.status,
    money: result.money,
    refundmoney: result.refundmoney,
  })

  return result
}

/**
 * Issue a (possibly partial) refund for an EPay order.
 *
 * Refunds are synchronous — the result is returned immediately in the
 * HTTP response. There is no refund webhook from the platform.
 *
 * An order may group several donation rows; a refund request can target only
 * a subset of them. `refundRatio` is the fraction of the original order being
 * refunded now (refundable-subset amount ÷ full-order amount). The CNY amount
 * is derived as `money × refundRatio` from the order-query endpoint (the
 * actual CNY charged), NOT recomputed from USD — this avoids mismatches when
 * the USD→CNY rate has drifted since payment, and sidesteps rounding error
 * from summing per-row USD amounts. The result is capped at the amount still
 * refundable on the platform (original minus already-refunded).
 *
 * `refundedCny` is the CNY amount actually submitted for refund.
 * code === 0 means the refund was accepted successfully.
 */
export async function processEPayRefund(params: {
  orderReference: string
  /** Fraction of the original order to refund now (0, 1]. Defaults to full (1). */
  refundRatio?: number
}): Promise<EPayRefundResponse & { refundedCny: number }> {
  // 1. Query the order to obtain the authoritative paid amount (CNY)
  const order = await queryEPayOrder(params.orderReference)
  if (order.code !== 0) {
    throw new Error(`EPay query error: ${order.msg || 'unknown error'}`)
  }

  // Reject orders that were never (fully) paid. status 2 (已退款) is allowed
  // here because partial refunds may leave a refundable remainder.
  if (
    order.status === EPAY_ORDER_STATUS.UNPAID ||
    order.status === EPAY_ORDER_STATUS.FROZEN ||
    order.status === EPAY_ORDER_STATUS.PRE_AUTH
  ) {
    throw new Error(`EPay order is not in a refundable state (status=${order.status})`)
  }

  const paidCny = parseFloat(order.money || '0')
  const alreadyRefundedCny = parseFloat(order.refundmoney || '0')
  const remainingCny = Math.round((paidCny - alreadyRefundedCny) * 100) / 100

  if (!(remainingCny > 0)) {
    throw new Error(
      `EPay order has no refundable amount remaining (status=${order.status}, money=${order.money}, refundmoney=${order.refundmoney})`
    )
  }

  // Proportional refund, capped at the platform's remaining refundable amount.
  const ratio = params.refundRatio ?? 1
  let refundCny = Math.round(paidCny * ratio * 100) / 100
  if (refundCny > remainingCny) refundCny = remainingCny

  if (!(refundCny > 0)) {
    throw new Error(`EPay computed refund amount is zero (ratio=${ratio}, money=${order.money})`)
  }

  const money = refundCny.toFixed(2)
  const timestamp = String(Math.floor(Date.now() / 1000))

  const reqParams: Record<string, string | number> = {
    pid: getPid(),
    out_trade_no: params.orderReference,
    money,
    out_refund_no: `REFUND-${params.orderReference}-${timestamp}`, // idempotency key
    timestamp,
  }

  logger.info('PAYMENT:EPAY', 'Initiating refund', {
    orderReference: params.orderReference,
    amountCny: money,
    ratio,
    remainingCny,
  })

  const result = (await postForm('/refund', reqParams)) as EPayRefundResponse

  logger.info('PAYMENT:EPAY', 'Refund response', {
    orderReference: params.orderReference,
    code: result.code,
    msg: result.msg,
    refundNo: result.refund_no,
  })

  return { ...result, refundedCny: refundCny }
}
