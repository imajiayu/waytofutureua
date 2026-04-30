import { sendEmail } from '../send'
import { generateDonationCompletedEmail } from '../templates/transactional/donation-completed'
import { DonationCompletedEmailParams } from '../types'

export async function sendDonationCompletedEmail(params: DonationCompletedEmailParams) {
  const { subject, html, text } = generateDonationCompletedEmail(params)
  return sendEmail({
    to: params.to,
    locale: params.locale,
    subject,
    html,
    text,
    category: 'EMAIL',
    label: 'donation completed',
  })
}
