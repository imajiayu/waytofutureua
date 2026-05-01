// ============================================
// Market 模块 WayForPay 支付工具
// 复用 lib/payment/wayforpay/server.ts 的基础函数
// ============================================

import {
  createWayForPayPayment,
  generateWebhookResponseSignature,
  verifyWayForPaySignature,
  type WayForPayPaymentParams,
} from '@/lib/payment/wayforpay/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua'

const WAYFORPAY_LANG_MAP: Record<string, 'UA' | 'EN' | 'RU'> = {
  en: 'EN',
  zh: 'EN', // WayForPay 不支持中文，回退英文
  ua: 'UA',
}

// ============================================
// 义卖支付参数生成
// ============================================

export function createMarketPayment(params: {
  orderReference: string
  itemTitle: string
  unitPrice: number
  quantity: number
  currency: 'UAH' | 'USD' | 'EUR'
  buyerName: string
  buyerEmail: string
  locale: string
}): WayForPayPaymentParams {
  const nameParts = params.buyerName.split(' ')
  const firstName = nameParts[0] || params.buyerName
  const lastName = nameParts.slice(1).join(' ') || ''

  return createWayForPayPayment({
    orderReference: params.orderReference,
    amount: params.unitPrice * params.quantity,
    currency: params.currency,
    productName: [params.itemTitle],
    productPrice: [params.unitPrice],
    productCount: [params.quantity],
    clientFirstName: firstName,
    clientLastName: lastName,
    clientEmail: params.buyerEmail,
    language: WAYFORPAY_LANG_MAP[params.locale] || 'EN',
    returnUrl: `${APP_URL}/${params.locale}/market/success?order=${params.orderReference}`,
    serviceUrl: `${APP_URL}/api/webhooks/wayforpay-market`,
  })
}

// ============================================
// 导出复用的验证函数
// ============================================

export { generateWebhookResponseSignature, verifyWayForPaySignature }
