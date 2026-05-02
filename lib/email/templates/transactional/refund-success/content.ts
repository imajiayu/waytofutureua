/**
 * Refund Success Email Content
 */

import type { AppLocale } from '@/types'

export interface RefundSuccessContent {
  subject: string
  title: string
  greeting: (name: string) => string
  confirmation: string
  processed: string
  refundAmountLabel: string
  donationIdsLabel: string
  gratitude: string
  hopeToContinue: string
  contact: string
}

export const refundSuccessContent: Record<AppLocale, RefundSuccessContent> = {
  en: {
    subject: 'Your Refund Has Been Completed',
    title: 'Refund Completed',
    greeting: (name: string) => `Dear ${name},`,
    confirmation: 'Your refund has been completed successfully.',
    processed: 'The following donation(s) have been refunded:',
    refundAmountLabel: 'Refund Amount:',
    donationIdsLabel: 'Donation IDs:',
    gratitude:
      'We appreciate your understanding and are sorry we could not fulfill your donation at this time.',
    hopeToContinue:
      'We hope you will consider supporting our mission again in the future. Your support means a lot to us.',
    contact: "If you have any questions about this refund, please don't hesitate to contact us.",
  },
  zh: {
    subject: '您的退款已完成',
    title: '退款已完成',
    greeting: (name: string) => `尊敬的 ${name}：`,
    confirmation: '您的退款已成功完成。',
    processed: '以下捐赠已完成退款：',
    refundAmountLabel: '退款金额：',
    donationIdsLabel: '捐赠编号：',
    gratitude: '感谢您的理解，很抱歉我们目前无法完成您的捐赠。',
    hopeToContinue: '我们希望您将来会考虑再次支持我们的使命。您的支持对我们意义重大。',
    contact: '如果您对此退款有任何疑问，请随时与我们联系。',
  },
  ua: {
    subject: 'Ваше повернення коштів завершено',
    title: 'Повернення коштів завершено',
    greeting: (name: string) => `Шановний(а) ${name},`,
    confirmation: 'Ваше повернення коштів успішно завершено.',
    processed: 'Наступні пожертвування було повернуто:',
    refundAmountLabel: 'Сума повернення:',
    donationIdsLabel: 'ID пожертвувань:',
    gratitude:
      'Ми цінуємо ваше розуміння і шкодуємо, що не змогли виконати ваше пожертвування на цей час.',
    hopeToContinue:
      'Ми сподіваємося, що ви розглянете можливість підтримати нашу місію знову в майбутньому. Ваша підтримка дуже важлива для нас.',
    contact: "Якщо у вас виникнуть запитання щодо цього повернення, будь ласка, зв'яжіться з нами.",
  },
}
