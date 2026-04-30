/**
 * Payment Success Email Content
 */

import { Locale } from '../../../types'

export interface PaymentSuccessContent {
  subject: string
  title: string
  greeting: (name: string) => string
  thankYou: string
  confirmation: string
  orderDetailsLabel: string
  projectLabel: string
  locationLabel: string
  amountLabel: string
  quantityUnit: (unitName: string) => string // For unit mode: "1 {unitName}"
  totalAmountLabel: string
  donationIdsLabel: string
  donationIdsNote: string
  trackingTitle: string
  trackingContent: string
  trackingButton: string
  nextStepsTitle: string
  nextStepsContent: string
  contact: string
}

export const paymentSuccessContent: Record<Locale, PaymentSuccessContent> = {
  en: {
    subject: 'Thank You for Your Donation - Payment Received',
    title: 'Thank You for Your Donation!',
    greeting: (name: string) => `Dear ${name},`,
    thankYou: 'Thank you for your generous donation!',
    confirmation: 'Your payment has been successfully processed. Here are your donation details:',
    orderDetailsLabel: 'Order Details',
    projectLabel: 'Project:',
    locationLabel: 'Location:',
    amountLabel: 'Amount:',
    quantityUnit: (unitName: string) => `1 ${unitName}`,
    totalAmountLabel: 'Total Amount:',
    donationIdsLabel: 'Your Donation IDs:',
    donationIdsNote:
      '⚠️ Please save these IDs for your records. You can use them to track your donation status at any time.',
    trackingTitle: 'Track Your Donation',
    trackingContent:
      'You can track the status of your donation at any time using your donation IDs.',
    trackingButton: 'Track My Donation',
    nextStepsTitle: 'What happens next?',
    nextStepsContent:
      'We will confirm your donation and begin processing it. You will receive updates as your donation progresses through confirmation, delivery, and completion stages.',
    contact: "If you have any questions, please don't hesitate to contact us.",
  },
  zh: {
    subject: '感谢您的捐赠 - 支付已确认',
    title: '感谢您的捐赠！',
    greeting: (name: string) => `尊敬的 ${name}：`,
    thankYou: '感谢您的慷慨捐赠！',
    confirmation: '您的支付已成功处理。以下是您的捐赠详情：',
    orderDetailsLabel: '订单详情',
    projectLabel: '项目：',
    locationLabel: '地点：',
    amountLabel: '金额：',
    quantityUnit: (unitName: string) => `1 ${unitName}`,
    totalAmountLabel: '总金额：',
    donationIdsLabel: '您的捐赠编号：',
    donationIdsNote: '⚠️ 请保存这些编号以便查询。您可以随时使用这些编号追踪您的捐赠状态。',
    trackingTitle: '追踪您的捐赠',
    trackingContent: '您可以随时使用您的捐赠编号追踪捐赠状态。',
    trackingButton: '追踪我的捐赠',
    nextStepsTitle: '后续流程',
    nextStepsContent:
      '我们将确认您的捐赠并开始处理。随着捐赠进展经过确认、配送和完成等阶段，您将收到更新通知。',
    contact: '如有任何疑问，请随时联系我们。',
  },
  ua: {
    subject: 'Дякуємо за ваше пожертвування - Платіж отримано',
    title: 'Дякуємо за ваше пожертвування!',
    greeting: (name: string) => `Шановний(а) ${name},`,
    thankYou: 'Дякуємо за ваше щедре пожертвування!',
    confirmation: 'Ваш платіж успішно оброблено. Ось деталі вашого пожертвування:',
    orderDetailsLabel: 'Деталі замовлення',
    projectLabel: 'Проект:',
    locationLabel: 'Місцезнаходження:',
    amountLabel: 'Сума:',
    quantityUnit: (unitName: string) => `1 ${unitName}`,
    totalAmountLabel: 'Загальна сума:',
    donationIdsLabel: 'Ваші ID пожертвувань:',
    donationIdsNote:
      '⚠️ Будь ласка, збережіть ці ідентифікатори для ваших записів. Ви можете використовувати їх для відстеження статусу вашого пожертвування в будь-який час.',
    trackingTitle: 'Відстежуйте своє пожертвування',
    trackingContent:
      'Ви можете відстежувати статус вашого пожертвування в будь-який час, використовуючи ваші ID пожертвувань.',
    trackingButton: 'Відстежити моє пожертвування',
    nextStepsTitle: 'Що далі?',
    nextStepsContent:
      'Ми підтвердимо ваше пожертвування та почнемо його обробку. Ви отримуватимете оновлення про статус на етапах підтвердження, доставки та завершення.',
    contact: 'Якщо у вас виникнуть запитання, будь ласка, не соромтеся звертатися до нас.',
  },
}
