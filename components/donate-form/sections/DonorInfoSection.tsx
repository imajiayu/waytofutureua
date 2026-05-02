'use client'

import { useTranslations } from 'next-intl'

import type { DonorInfo } from '@/types/dtos'

import type { FieldErrors, FieldKey } from './types'

interface Props {
  donorName: string
  donorEmail: string
  updateDonorInfo: <K extends keyof DonorInfo>(key: K, value: DonorInfo[K]) => void
  fieldErrors: FieldErrors
  clearFieldError: (key: FieldKey) => void
  nameInputRef: React.RefObject<HTMLInputElement | null>
  emailInputRef: React.RefObject<HTMLInputElement | null>
}

export default function DonorInfoSection({
  donorName,
  donorEmail,
  updateDonorInfo,
  fieldErrors,
  clearFieldError,
  nameInputRef,
  emailInputRef,
}: Props) {
  const t = useTranslations('donate')

  return (
    <div className="space-y-3">
      <h4 className="border-b pb-2 font-display font-semibold text-gray-900">{t('donor.title')}</h4>

      <div>
        <label htmlFor="donor-name" className="mb-1 block text-sm font-medium">
          {t('donor.name')} *
        </label>
        <input
          id="donor-name"
          ref={nameInputRef}
          type="text"
          required
          minLength={2}
          maxLength={255}
          value={donorName}
          onChange={(e) => {
            clearFieldError('name')
            updateDonorInfo('name', e.target.value)
          }}
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? 'donor-name-error' : undefined}
          className="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
          placeholder={t('donor.namePlaceholder')}
        />
        <p className="mt-1 text-xs text-gray-500">{t('donor.nameHint')}</p>
        {fieldErrors.name && (
          <p
            id="donor-name-error"
            role="alert"
            className="mt-1 flex items-start gap-1 text-xs text-red-600"
          >
            <svg
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{fieldErrors.name}</span>
          </p>
        )}
      </div>

      <div>
        <label htmlFor="donor-email" className="mb-1 block text-sm font-medium">
          {t('donor.email')} *
        </label>
        <input
          id="donor-email"
          ref={emailInputRef}
          type="email"
          required
          value={donorEmail}
          onChange={(e) => {
            clearFieldError('email')
            updateDonorInfo('email', e.target.value)
          }}
          onBlur={(e) => updateDonorInfo('email', e.target.value.trim())}
          pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'donor-email-error' : undefined}
          className="w-full rounded-lg border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
          placeholder={t('donor.emailPlaceholder')}
        />
        <p className="mt-1 text-xs text-gray-500">{t('donor.emailHint')}</p>
        {fieldErrors.email && (
          <p
            id="donor-email-error"
            role="alert"
            className="mt-1 flex items-start gap-1 text-xs text-red-600"
          >
            <svg
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{fieldErrors.email}</span>
          </p>
        )}
      </div>
    </div>
  )
}
