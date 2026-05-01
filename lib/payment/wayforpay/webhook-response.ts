import { NextResponse } from 'next/server'

import { generateWebhookResponseSignature } from '@/lib/payment/wayforpay/server'

/**
 * Generate the WayForPay webhook acknowledgement response.
 *
 * Used by both the donation webhook (`/api/webhooks/wayforpay`) and the
 * market webhook (`/api/webhooks/wayforpay-market`). Returning this signed
 * payload tells WayForPay the callback was received successfully and stops
 * retries.
 *
 * Signature input: `orderReference;status;time` (HMAC-MD5 with secret_key).
 * Response shape and field order MUST stay byte-equal to the prior inline
 * implementations — WayForPay validates this signature on its side.
 */
export function respondWithAccept(orderReference: string) {
  const time = Math.floor(Date.now() / 1000)
  const signature = generateWebhookResponseSignature(orderReference, 'accept', time)
  return NextResponse.json({ orderReference, status: 'accept', time, signature })
}
