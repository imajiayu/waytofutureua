/**
 * Market Order Paid Email Content
 */

import { Locale } from '../../../types'

export interface MarketOrderPaidContent {
  subject: (orderRef: string) => string
  title: string
  greeting: (name: string) => string
  thankYou: string
  confirmation: string
  orderDetailsLabel: string
  orderRefLabel: string
  itemLabel: string
  quantityLabel: string
  unitPriceLabel: string
  totalAmountLabel: string
  shippingToLabel: string
  nextStepsTitle: string
  nextStepsContent: string
  viewOrderButton: string
  contact: string
}

export const marketOrderPaidContent: Record<Locale, MarketOrderPaidContent> = {
  en: {
    subject: (orderRef: string) => `Order Confirmed - ${orderRef}`,
    title: 'Your Order is Confirmed!',
    greeting: (name: string) => `Dear ${name},`,
    thankYou: 'Thank you for your purchase!',
    confirmation: 'Your payment has been successfully processed. Here are your order details:',
    orderDetailsLabel: 'Order Details',
    orderRefLabel: 'Order Number:',
    itemLabel: 'Item:',
    quantityLabel: 'Quantity:',
    unitPriceLabel: 'Unit Price:',
    totalAmountLabel: 'Total Amount:',
    shippingToLabel: 'Shipping To:',
    nextStepsTitle: 'What Happens Next?',
    nextStepsContent: 'We will prepare your item and notify you by email once it has been shipped. You can check your order status at any time.',
    viewOrderButton: 'View My Orders',
    contact: 'If you have any questions about your order, please don\'t hesitate to contact us.'
  },
  zh: {
    subject: (orderRef: string) => `订单已确认 - ${orderRef}`,
    title: '您的订单已确认！',
    greeting: (name: string) => `尊敬的 ${name}：`,
    thankYou: '感谢您的购买！',
    confirmation: '您的支付已成功处理。以下是您的订单详情：',
    orderDetailsLabel: '订单详情',
    orderRefLabel: '订单编号：',
    itemLabel: '商品：',
    quantityLabel: '数量：',
    unitPriceLabel: '单价：',
    totalAmountLabel: '总金额：',
    shippingToLabel: '收货地址：',
    nextStepsTitle: '后续流程',
    nextStepsContent: '我们将准备您的商品，发货后会通过邮件通知您。您可以随时查看订单状态。',
    viewOrderButton: '查看我的订单',
    contact: '如对订单有任何疑问，请随时联系我们。'
  },
  ua: {
    subject: (orderRef: string) => `Замовлення підтверджено - ${orderRef}`,
    title: 'Ваше замовлення підтверджено!',
    greeting: (name: string) => `Шановний(а) ${name},`,
    thankYou: 'Дякуємо за вашу покупку!',
    confirmation: 'Ваш платіж успішно оброблено. Ось деталі вашого замовлення:',
    orderDetailsLabel: 'Деталі замовлення',
    orderRefLabel: 'Номер замовлення:',
    itemLabel: 'Товар:',
    quantityLabel: 'Кількість:',
    unitPriceLabel: 'Ціна за одиницю:',
    totalAmountLabel: 'Загальна сума:',
    shippingToLabel: 'Доставка:',
    nextStepsTitle: 'Що далі?',
    nextStepsContent: 'Ми підготуємо ваш товар і повідомимо вас електронною поштою, коли він буде відправлений. Ви можете перевірити статус замовлення в будь-який час.',
    viewOrderButton: 'Переглянути мої замовлення',
    contact: 'Якщо у вас виникнуть запитання щодо замовлення, будь ласка, зв\'яжіться з нами.'
  }
}
