import { createSign, createVerify } from 'crypto'

import { logger } from '@/lib/logger'

/**
 * Load a PEM key from an environment variable.
 *
 * Handles two formats:
 *  1. Full PEM (has -----BEGIN ... ----- headers) — restore literal \n to real newlines
 *  2. Raw Base64 (no headers, as stored in the merchant backend) — wrap with headers
 */
function getPem(envKey: string, type: 'private' | 'public'): string {
  const raw = process.env[envKey]
  if (!raw) throw new Error(`${envKey} is not configured`)

  const value = raw.trim()

  // Already in PEM format
  if (value.startsWith('-----')) {
    return value.replace(/\\n/g, '\n')
  }

  // Raw Base64 — strip any whitespace/literal-\n, then wrap in 64-char lines
  const b64 = value.replace(/\\n/g, '').replace(/\s/g, '')
  const lines = b64.match(/.{1,64}/g) ?? []
  const header = type === 'private' ? 'PRIVATE KEY' : 'PUBLIC KEY'
  return `-----BEGIN ${header}-----\n${lines.join('\n')}\n-----END ${header}-----`
}

/**
 * Build the canonical sign string used by EPay v2 (易支付).
 *
 * Rules:
 *  - Exclude fields with empty/null/undefined values
 *  - Exclude the `sign` and `sign_type` fields themselves
 *  - Sort remaining keys by ASCII order (ascending)
 *  - Join as key=value&key=value
 */
export function buildSignString(
  params: Record<string, string | number | undefined | null>
): string {
  return Object.keys(params)
    .filter(
      (k) =>
        k !== 'sign' &&
        k !== 'sign_type' &&
        params[k] !== undefined &&
        params[k] !== null &&
        params[k] !== ''
    )
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
}

/**
 * Sign the given string with the merchant RSA private key.
 * Returns Base64-encoded SHA256WithRSA signature.
 */
export function signWithPrivateKey(signString: string): string {
  const signer = createSign('SHA256')
  signer.update(signString, 'utf8')
  return signer.sign(getPem('EPAY_MERCHANT_PRIVATE_KEY', 'private'), 'base64')
}

/**
 * Verify a webhook callback signature using the platform RSA public key.
 * Returns false on any error (treats errors as invalid signatures).
 */
export function verifyEPaySignature(
  params: Record<string, string | undefined | null>,
  receivedSign: string
): boolean {
  try {
    const signString = buildSignString(params)
    const verifier = createVerify('SHA256')
    verifier.update(signString, 'utf8')
    return verifier.verify(getPem('EPAY_PLATFORM_PUBLIC_KEY', 'public'), receivedSign, 'base64')
  } catch (error) {
    logger.error('PAYMENT:EPAY', 'Signature verification failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/**
 * Add RSA signature to a params object and return the augmented object.
 * The original params are not mutated.
 */
export function attachSignature(
  params: Record<string, string | number>
): Record<string, string | number> {
  const signString = buildSignString(params)
  return { ...params, sign: signWithPrivateKey(signString), sign_type: 'RSA' }
}
