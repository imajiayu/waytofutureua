import crypto from 'crypto'

import { logger } from '@/lib/logger'

import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  FullCurrencyInfo,
  NowPaymentsError,
} from './types'

// Validate environment variables
if (!process.env.NOWPAYMENTS_API_KEY) {
  logger.warn('PAYMENT:NOWPAYMENTS', 'API key not set - integration will not work')
}

if (!process.env.NOWPAYMENTS_IPN_SECRET) {
  logger.warn('PAYMENT:NOWPAYMENTS', 'IPN secret not set - webhook verification will fail')
}

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || ''
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || ''
const NOWPAYMENTS_API_BASE = 'https://api.nowpayments.io/v1'

/**
 * Sort object keys alphabetically (required for signature verification)
 */
function sortObjectKeys(obj: Record<string, any>): Record<string, any> {
  const sorted: Record<string, any> = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    const value = obj[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sorted[key] = sortObjectKeys(value)
    } else {
      sorted[key] = value
    }
  }
  return sorted
}

/**
 * Verify NOWPayments IPN (webhook) signature
 * @see https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389-IPN-and-how-to-setup
 *
 * The signature verification process:
 * 1. Sort the webhook body keys alphabetically
 * 2. Generate HMAC-SHA512 hash using IPN secret
 * 3. Compare with received signature
 */
export function verifyNowPaymentsSignature(
  body: Record<string, any>,
  receivedSignature: string
): boolean {
  if (!NOWPAYMENTS_IPN_SECRET) {
    logger.error('PAYMENT:NOWPAYMENTS', 'IPN secret not configured')
    return false
  }

  try {
    // Sort body keys alphabetically
    const sortedBody = sortObjectKeys(body)
    const bodyString = JSON.stringify(sortedBody)

    // Generate HMAC-SHA512 signature
    const hmac = crypto.createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    hmac.update(bodyString)
    const calculatedSignature = hmac.digest('hex')

    // Compare signatures (case-insensitive, timing-safe)
    const a = Buffer.from(calculatedSignature.toLowerCase(), 'utf-8')
    const b = Buffer.from(receivedSignature.toLowerCase(), 'utf-8')
    if (a.length !== b.length) {
      // Dummy constant-time comparison to prevent timing leakage on length mismatch
      crypto.timingSafeEqual(a, Buffer.alloc(a.length))
      return false
    }
    return crypto.timingSafeEqual(a, b)
  } catch (error) {
    logger.errorWithStack('PAYMENT:NOWPAYMENTS', 'Signature verification error', error)
    return false
  }
}

/**
 * Create a NOWPayments payment
 * @see https://documenter.getpostman.com/view/7907941/2s93JusNJt#create-payment
 */
export async function createNowPaymentsPayment(
  params: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error('NOWPAYMENTS_API_KEY is not configured')
  }

  logger.info('PAYMENT:NOWPAYMENTS', 'Creating payment', {
    orderId: params.order_id,
    priceAmount: params.price_amount,
    priceCurrency: params.price_currency,
    payCurrency: params.pay_currency || '(user choice)',
  })

  const response = await fetch(`${NOWPAYMENTS_API_BASE}/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NOWPAYMENTS_API_KEY,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorData = (await response.json()) as NowPaymentsError
    logger.error('PAYMENT:NOWPAYMENTS', 'Create payment error', {
      status: response.status,
      code: errorData.code,
      message: errorData.message,
    })
    throw new Error(`NOWPayments API error: ${errorData.message || response.statusText}`)
  }

  const data = (await response.json()) as CreatePaymentResponse

  logger.info('PAYMENT:NOWPAYMENTS', 'Payment created', {
    paymentId: data.payment_id,
    payAmount: data.pay_amount,
    payCurrency: data.pay_currency,
    status: data.payment_status,
  })

  return data
}

/**
 * Get minimum payment amount in USD for a specific pay currency
 * This queries the real minimum based on the crypto -> outcome wallet conversion
 * then converts it to USD for display
 *
 * @param payCurrency - The cryptocurrency the user will pay with (e.g., 'btc', 'eth')
 * @param outcomeWallet - The merchant's outcome wallet currency (default: 'usdttrc20')
 */
export async function getMinimumPaymentAmountInUsd(
  payCurrency: string,
  outcomeWallet: string = 'usdttrc20'
): Promise<number> {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error('NOWPAYMENTS_API_KEY is not configured')
  }

  try {
    // Step 1: Get minimum in crypto (payCurrency -> outcomeWallet)
    const minResponse = await fetch(
      `${NOWPAYMENTS_API_BASE}/min-amount?currency_from=${payCurrency}&currency_to=${outcomeWallet}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': NOWPAYMENTS_API_KEY,
        },
      }
    )

    const minData = await minResponse.json()

    // Check if the conversion is not supported
    if (minData.status === false || !minData.min_amount) {
      // Fall back to USD -> payCurrency minimum
      return await getFallbackMinimum(payCurrency)
    }

    const minCrypto = minData.min_amount

    // Step 2: Convert crypto minimum to USD using estimate
    const estResponse = await fetch(
      `${NOWPAYMENTS_API_BASE}/estimate?amount=${minCrypto}&currency_from=${payCurrency}&currency_to=usd`,
      {
        method: 'GET',
        headers: {
          'x-api-key': NOWPAYMENTS_API_KEY,
        },
      }
    )

    const estData = await estResponse.json()

    // Check if estimate failed
    if (estData.status === false || !estData.estimated_amount) {
      return await getFallbackMinimum(payCurrency)
    }

    // estimated_amount is returned as a string
    const usdAmount = parseFloat(estData.estimated_amount)

    // Add 10% buffer for exchange rate fluctuations
    return Math.ceil(usdAmount * 1.1 * 100) / 100
  } catch {
    // On any error, use fallback
    return await getFallbackMinimum(payCurrency)
  }
}

/**
 * Fallback method: Get minimum using USD -> payCurrency query
 */
async function getFallbackMinimum(payCurrency: string): Promise<number> {
  const response = await fetch(
    `${NOWPAYMENTS_API_BASE}/min-amount?currency_from=usd&currency_to=${payCurrency}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get minimum amount: ${response.statusText}`)
  }

  const data = await response.json()
  return data.min_amount || 20 // Default to $20 if no data
}

/**
 * Get full currency information with logos and metadata
 * Only returns currencies available for payment
 */
export async function fetchAvailableCurrencies(): Promise<FullCurrencyInfo[]> {
  if (!NOWPAYMENTS_API_KEY) {
    throw new Error('NOWPAYMENTS_API_KEY is not configured')
  }

  const response = await fetch(`${NOWPAYMENTS_API_BASE}/full-currencies`, {
    method: 'GET',
    headers: {
      'x-api-key': NOWPAYMENTS_API_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get currencies: ${response.statusText}`)
  }

  const data = await response.json()

  // Filter to only show currencies available for payment
  return data.currencies.filter((c: FullCurrencyInfo) => c.available_for_payment)
}

// Re-export types for convenience
export * from './types'
