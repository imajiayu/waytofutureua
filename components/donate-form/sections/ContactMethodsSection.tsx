'use client'

import { useTranslations } from 'next-intl'

import type { DonorInfo } from '@/types/dtos'

interface Props {
  contactTelegram: string
  contactWhatsapp: string
  updateDonorInfo: <K extends keyof DonorInfo>(key: K, value: DonorInfo[K]) => void
}

export default function ContactMethodsSection({
  contactTelegram,
  contactWhatsapp,
  updateDonorInfo,
}: Props) {
  const t = useTranslations('donate')

  return (
    <div className="space-y-3">
      <div>
        <h4 className="border-b pb-2 font-display font-semibold text-gray-900">
          {t('contact.title')}
        </h4>
        <p className="mt-1 text-xs text-gray-600">{t('contact.description')}</p>
      </div>

      <div>
        <label htmlFor="contact-telegram" className="mb-1 block text-sm font-medium">
          {t('contact.telegram')}
        </label>
        <input
          id="contact-telegram"
          type="text"
          maxLength={255}
          value={contactTelegram}
          onChange={(e) => updateDonorInfo('telegram', e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
          placeholder={t('contact.telegramPlaceholder')}
        />
      </div>

      <div>
        <label htmlFor="contact-whatsapp" className="mb-1 block text-sm font-medium">
          {t('contact.whatsapp')}
        </label>
        <input
          id="contact-whatsapp"
          type="text"
          maxLength={255}
          value={contactWhatsapp}
          onChange={(e) => updateDonorInfo('whatsapp', e.target.value)}
          className="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
          placeholder={t('contact.whatsappPlaceholder')}
        />
      </div>
    </div>
  )
}
