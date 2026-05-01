'use client'

import { useTranslations } from 'next-intl'

import type { DonorInfo } from '../DonationFormCard'

interface Props {
  donorMessage: string
  subscribeToNewsletter: boolean
  updateDonorInfo: <K extends keyof DonorInfo>(key: K, value: DonorInfo[K]) => void
}

export default function MessageAndNewsletterSection({
  donorMessage,
  subscribeToNewsletter,
  updateDonorInfo,
}: Props) {
  const t = useTranslations('donate')

  return (
    <>
      <div>
        <label htmlFor="donor-message" className="mb-1 block text-sm font-medium">
          {t('message.label')}
        </label>
        <textarea
          id="donor-message"
          maxLength={1000}
          rows={3}
          value={donorMessage}
          onChange={(e) => updateDonorInfo('message', e.target.value)}
          className="w-full resize-none rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
          placeholder={t('message.placeholder')}
        />
        <p className="mt-1 text-xs text-gray-500">
          {t('message.hint', { remaining: 1000 - donorMessage.length })}
        </p>
      </div>

      <div className="pt-2">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={subscribeToNewsletter}
            onChange={(e) => updateDonorInfo('subscribeToNewsletter', e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 bg-transparent text-gray-400 focus:ring-0 focus:ring-offset-0"
          />
          <span className="text-xs text-gray-500">
            {t('subscription.label')} · {t('subscription.privacyNote')}
          </span>
        </label>
      </div>
    </>
  )
}
