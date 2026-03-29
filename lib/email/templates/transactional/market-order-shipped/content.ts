/**
 * Market Order Shipped Email Content
 */

import { Locale } from '../../../types'

export interface MarketOrderShippedContent {
  subject: (orderRef: string) => string
  title: string
  greeting: (name: string) => string
  shippedNotice: string
  orderDetailsLabel: string
  orderRefLabel: string
  itemLabel: string
  quantityLabel: string
  totalAmountLabel: string
  shippingToLabel: string
  trackingTitle: string
  trackingNumberLabel: string
  carrierLabel: string
  shippingProofTitle: string
  shippingProofDescription: string
  viewOrderButton: string
  deliveryNote: string
  contact: string
}

export const marketOrderShippedContent: Record<Locale, MarketOrderShippedContent> = {
  en: {
    subject: (orderRef: string) => `Your Order ${orderRef} Has Been Shipped`,
    title: 'Your Order is On Its Way!',
    greeting: (name: string) => `Dear ${name},`,
    shippedNotice: 'Great news! Your order has been shipped and is on its way to you.',
    orderDetailsLabel: 'Order Details',
    orderRefLabel: 'Order Number:',
    itemLabel: 'Item:',
    quantityLabel: 'Quantity:',
    totalAmountLabel: 'Total Amount:',
    shippingToLabel: 'Shipping To:',
    trackingTitle: 'Tracking Information',
    trackingNumberLabel: 'Tracking Number:',
    carrierLabel: 'Carrier:',
    shippingProofTitle: 'Shipping Confirmation',
    shippingProofDescription: 'Here is the shipping proof for your order:',
    viewOrderButton: 'View My Orders',
    deliveryNote: 'Delivery times may vary depending on your location. Please allow a few days for the package to arrive.',
    contact: 'If you have any questions about your shipment, please don\'t hesitate to contact us.'
  },
  zh: {
    subject: (orderRef: string) => `您的订单 ${orderRef} 已发货`,
    title: '您的订单已发出！',
    greeting: (name: string) => `尊敬的 ${name}：`,
    shippedNotice: '好消息！您的订单已发货，正在运送途中。',
    orderDetailsLabel: '订单详情',
    orderRefLabel: '订单编号：',
    itemLabel: '商品：',
    quantityLabel: '数量：',
    totalAmountLabel: '总金额：',
    shippingToLabel: '收货地址：',
    trackingTitle: '物流信息',
    trackingNumberLabel: '快递单号：',
    carrierLabel: '快递公司：',
    shippingProofTitle: '发货确认',
    shippingProofDescription: '以下是您订单的发货凭证：',
    viewOrderButton: '查看我的订单',
    deliveryNote: '配送时间因地区而异，请耐心等待包裹到达。',
    contact: '如对物流有任何疑问，请随时联系我们。'
  },
  ua: {
    subject: (orderRef: string) => `Ваше замовлення ${orderRef} відправлено`,
    title: 'Ваше замовлення в дорозі!',
    greeting: (name: string) => `Шановний(а) ${name},`,
    shippedNotice: 'Чудові новини! Ваше замовлення відправлено і прямує до вас.',
    orderDetailsLabel: 'Деталі замовлення',
    orderRefLabel: 'Номер замовлення:',
    itemLabel: 'Товар:',
    quantityLabel: 'Кількість:',
    totalAmountLabel: 'Загальна сума:',
    shippingToLabel: 'Доставка:',
    trackingTitle: 'Інформація про відстеження',
    trackingNumberLabel: 'Номер відстеження:',
    carrierLabel: 'Перевізник:',
    shippingProofTitle: 'Підтвердження відправки',
    shippingProofDescription: 'Ось підтвердження відправки вашого замовлення:',
    viewOrderButton: 'Переглянути мої замовлення',
    deliveryNote: 'Термін доставки може відрізнятися залежно від вашого місцезнаходження. Будь ласка, зачекайте кілька днів на прибуття посилки.',
    contact: 'Якщо у вас виникнуть запитання щодо доставки, будь ласка, зв\'яжіться з нами.'
  }
}
