/**
 * Email System Type Definitions
 */

import type { I18nText } from '@/types'

export type Locale = 'en' | 'zh' | 'ua'

export { type I18nText }

// Base email parameters
export interface BaseEmailParams {
  to: string
  locale: Locale
}

// Single donation item for email display
export interface DonationItem {
  donationPublicId: string
  projectNameI18n: I18nText
  locationI18n: I18nText
  unitNameI18n: I18nText
  amount: number
  isAggregate: boolean // true for aggregate mode (no unit_name), false for unit mode
}

// Payment success email parameters
export interface PaymentSuccessEmailParams extends BaseEmailParams {
  donorName: string
  donations: DonationItem[] // Multiple donations in an order
  totalAmount: number
  currency: string
}

// Donation completed email parameters
export interface DonationCompletedEmailParams extends BaseEmailParams {
  donorName: string
  projectNameI18n: I18nText
  locationI18n: I18nText
  unitNameI18n: I18nText
  donationIds: string[]
  quantity: number
  totalAmount: number
  currency: string
  resultImageUrl?: string
}

// Market order shared shipping info
export interface MarketShippingInfo {
  shippingName: string
  shippingCity: string
  shippingCountry: string
}

// Market order paid (payment confirmed)
export interface MarketOrderPaidEmailParams extends BaseEmailParams, MarketShippingInfo {
  orderReference: string
  itemTitleI18n: I18nText
  quantity: number
  unitPrice: number
  totalAmount: number
  currency: string
}

// Market order shipped
export interface MarketOrderShippedEmailParams extends BaseEmailParams, MarketShippingInfo {
  orderReference: string
  itemTitleI18n: I18nText
  quantity: number
  totalAmount: number
  currency: string
  trackingNumber: string
  trackingCarrier?: string
  proofImageUrls: string[]
}

// Market order completed
export interface MarketOrderCompletedEmailParams extends BaseEmailParams, MarketShippingInfo {
  orderReference: string
  itemTitleI18n: I18nText
  quantity: number
  totalAmount: number
  currency: string
  proofImageUrls: string[]
}

// Refund success email parameters
export interface RefundSuccessEmailParams extends BaseEmailParams {
  donorName: string
  projectNameI18n: I18nText
  donationIds: string[]
  refundAmount: number
  currency: string
  refundReason?: string
}

// Email content structure
export interface EmailContent {
  subject: string
  html: string
  text: string
}

// Organization branding
export interface OrgBranding {
  name: I18nText
  logoUrl: string
  websiteUrl: string
  contactEmail: string
  socialLinks?: {
    facebook?: string
    twitter?: string
    instagram?: string
  }
}
