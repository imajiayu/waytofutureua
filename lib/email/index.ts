/**
 * Email System - Main Entry Point
 *
 * This module provides a unified email system with:
 * - Templated emails for different scenarios (payment success, donation completed, refund)
 * - Multi-language support (en, zh, ua)
 * - Consistent branding and styling
 * - Type-safe parameters
 */

// Export types
export type {
  BaseEmailParams,
  DonationCompletedEmailParams,
  DonationItem,
  EmailContent,
  I18nText,
  Locale,
  MarketOrderCompletedEmailParams,
  MarketOrderPaidEmailParams,
  MarketOrderShippedEmailParams,
  OrgBranding,
  PaymentSuccessEmailParams,
  RefundSuccessEmailParams,
} from './types'

// Export client
export { getFromEmail, resend } from './client'

// Export configuration
export { EMAIL_COLORS, ORG_BRANDING } from './config'

// Export utilities
export { escapeHtml, formatCurrency, getLocalizedText, getTrackingUrl } from './utils'

// Export email senders (main API)
export { sendDonationCompletedEmail } from './senders/donation-completed'
export {
  sendMarketOrderCompletedEmail,
  sendMarketOrderPaidEmail,
  sendMarketOrderShippedEmail,
} from './senders/market'
export { sendPaymentSuccessEmail } from './senders/payment-success'
export { sendRefundSuccessEmail } from './senders/refund-success'

// Export template generators (for advanced usage)
export { generateDonationCompletedEmail } from './templates/transactional/donation-completed'
export { generateMarketOrderCompletedEmail } from './templates/transactional/market-order-completed'
export { generateMarketOrderPaidEmail } from './templates/transactional/market-order-paid'
export { generateMarketOrderShippedEmail } from './templates/transactional/market-order-shipped'
export { generatePaymentSuccessEmail } from './templates/transactional/payment-success'
export { generateRefundSuccessEmail } from './templates/transactional/refund-success'
