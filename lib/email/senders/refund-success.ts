import { sendEmail } from '../send'
import { generateRefundSuccessEmail } from '../templates/transactional/refund-success'
import { RefundSuccessEmailParams } from '../types'

export async function sendRefundSuccessEmail(params: RefundSuccessEmailParams) {
  const { subject, html, text } = generateRefundSuccessEmail(params)
  return sendEmail({
    to: params.to,
    locale: params.locale,
    subject,
    html,
    text,
    category: 'EMAIL',
    label: 'refund success',
  })
}
