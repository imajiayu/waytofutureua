import { sendEmail } from '../send'
import { generatePaymentSuccessEmail } from '../templates/transactional/payment-success'
import { PaymentSuccessEmailParams } from '../types'

export async function sendPaymentSuccessEmail(params: PaymentSuccessEmailParams) {
  const { subject, html, text } = generatePaymentSuccessEmail(params)
  return sendEmail({
    to: params.to,
    locale: params.locale,
    subject,
    html,
    text,
    category: 'EMAIL',
    label: 'payment success',
  })
}
