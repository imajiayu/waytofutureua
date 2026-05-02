import type { EmailTemplate } from '../../types'

/**
 * Project 3 Completed - Christmas Gift Program Success
 * Notify subscribers about the successful completion of the Christmas gift project
 */
const template: EmailTemplate = {
  name: 'Christmas Gift Project Completed',
  fileName: 'project3-completed',
  subject: {
    en: '70 Children Received Christmas Gifts - Thank You!',
    zh: '70名儿童收到圣诞礼物 - 感谢您的支持！',
    ua: '70 дітей отримали різдвяні подарунки - Дякуємо!',
  },
  projectId: '3',
}

export default template
