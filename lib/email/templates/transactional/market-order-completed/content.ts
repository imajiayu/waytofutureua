/**
 * Market Order Completed Email Content
 */

import type { AppLocale } from '@/types'

export interface MarketOrderCompletedContent {
  subject: (orderRef: string) => string
  title: string
  greeting: (name: string) => string
  congratulations: string
  completedMessage: string
  impactMessage: string
  orderDetailsLabel: string
  orderRefLabel: string
  itemLabel: string
  quantityLabel: string
  totalAmountLabel: string
  shippingToLabel: string
  fundUsageProofTitle: string
  fundUsageProofDescription: string
  viewOrderButton: string
  shareTitle: string
  shareContent: string
  gratitude: string
  contact: string
}

export const marketOrderCompletedContent: Record<AppLocale, MarketOrderCompletedContent> = {
  en: {
    subject: (orderRef: string) => `Your Order ${orderRef} is Complete!`,
    title: 'Order Complete!',
    greeting: (name: string) => `Dear ${name},`,
    congratulations: '🎉 Thank You!',
    completedMessage:
      'Your charity market order has been completed. The funds from your purchase have been used to support our humanitarian mission.',
    impactMessage:
      'Your purchase directly contributes to humanitarian aid in Ukraine. Every order makes a real difference.',
    orderDetailsLabel: 'Order Details',
    orderRefLabel: 'Order Number:',
    itemLabel: 'Item:',
    quantityLabel: 'Quantity:',
    totalAmountLabel: 'Your Contribution:',
    shippingToLabel: 'Shipped To:',
    fundUsageProofTitle: 'Fund Usage Proof',
    fundUsageProofDescription: 'Here is proof of how the funds from your purchase were used:',
    viewOrderButton: 'View Order Details',
    shareTitle: 'Share the Impact',
    shareContent:
      'We encourage you to share our charity market with friends and family to help us reach more people in need.',
    gratitude:
      'We are deeply grateful for your support through our charity market. Together, we are building a better future.',
    contact:
      'Thank you once again for your generous support. If you have any questions, please feel free to contact us.',
  },
  zh: {
    subject: (orderRef: string) => `您的订单 ${orderRef} 已完成！`,
    title: '订单完成！',
    greeting: (name: string) => `尊敬的 ${name}：`,
    congratulations: '🎉 感谢您！',
    completedMessage: '您的义卖订单已完成。您的购买所得资金已用于支持我们的人道主义使命。',
    impactMessage: '您的每一次购买都直接为乌克兰的人道主义援助做出贡献。每笔订单都意义非凡。',
    orderDetailsLabel: '订单详情',
    orderRefLabel: '订单编号：',
    itemLabel: '商品：',
    quantityLabel: '数量：',
    totalAmountLabel: '您的贡献：',
    shippingToLabel: '已送达：',
    fundUsageProofTitle: '资金用途凭证',
    fundUsageProofDescription: '以下是您购买所得资金的使用凭证：',
    viewOrderButton: '查看订单详情',
    shareTitle: '分享影响力',
    shareContent: '我们鼓励您与朋友和家人分享我们的义卖活动，帮助我们惠及更多有需要的人。',
    gratitude: '我们深深感谢您通过义卖活动对我们的支持。让我们携手共建更美好的未来。',
    contact: '再次感谢您的慷慨支持。如有任何疑问，请随时与我们联系。',
  },
  ua: {
    subject: (orderRef: string) => `Ваше замовлення ${orderRef} завершено!`,
    title: 'Замовлення завершено!',
    greeting: (name: string) => `Шановний(а) ${name},`,
    congratulations: '🎉 Дякуємо!',
    completedMessage:
      'Ваше замовлення на благодійному ярмарку завершено. Кошти від вашої покупки використані для підтримки нашої гуманітарної місії.',
    impactMessage:
      'Ваша покупка безпосередньо сприяє гуманітарній допомозі в Україні. Кожне замовлення має реальне значення.',
    orderDetailsLabel: 'Деталі замовлення',
    orderRefLabel: 'Номер замовлення:',
    itemLabel: 'Товар:',
    quantityLabel: 'Кількість:',
    totalAmountLabel: 'Ваш внесок:',
    shippingToLabel: 'Доставлено:',
    fundUsageProofTitle: 'Підтвердження використання коштів',
    fundUsageProofDescription: 'Ось підтвердження використання коштів від вашої покупки:',
    viewOrderButton: 'Переглянути деталі замовлення',
    shareTitle: 'Поділіться впливом',
    shareContent:
      'Ми заохочуємо вас поділитися нашим благодійним ярмарком з друзями та родиною, щоб допомогти нам охопити більше людей, які потребують допомоги.',
    gratitude:
      'Ми глибоко вдячні за вашу підтримку через наш благодійний ярмарок. Разом ми будуємо краще майбутнє.',
    contact:
      "Ще раз дякуємо за вашу щедру підтримку. Якщо у вас виникнуть запитання, будь ласка, зв'яжіться з нами.",
  },
}
