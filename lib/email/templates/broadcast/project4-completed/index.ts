import type { EmailTemplate } from '../../types'

/**
 * Project 4 Completed - Aid for Single Mother with 8 Children
 * Notify subscribers about the successful completion of the family aid project
 */
const template: EmailTemplate = {
  name: 'Aid for Single Mother Family - Completed',
  fileName: 'project4-completed',
  subject: {
    en: 'Gifts Delivered to a Family of 8 Children - Thank You!',
    zh: '爱心物资已送达8个孩子的新家 - 感谢您的支持！',
    ua: 'Допомогу доставлено родині з 8 дітьми - Дякуємо!',
  },
  projectId: '4',
}

export default template
