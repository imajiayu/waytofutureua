/**
 * Email System - Main Entry Point
 *
 * This module provides a unified email system with:
 * - Templated emails for different scenarios (payment success, donation completed, refund)
 * - Multi-language support (en, zh, ua)
 * - Consistent branding and styling
 * - Type-safe parameters
 */

export { sendDonationCompletedEmail } from './senders/donation-completed'
export {
  sendMarketOrderCompletedEmail,
  sendMarketOrderPaidEmail,
  sendMarketOrderShippedEmail,
} from './senders/market'
export { sendPaymentSuccessEmail } from './senders/payment-success'
export { sendRefundSuccessEmail } from './senders/refund-success'
export type { DonationItem } from './types'
