'use client'

import { useTranslations } from 'next-intl'

import { HashIcon, MailIcon, SearchIcon } from '@/components/icons'
import Card from '@/components/ui/Card'

interface Props {
  email: string
  setEmail: (v: string) => void
  donationId: string
  setDonationId: (v: string) => void
  error: string
  setError: (v: string) => void
  loading: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function SearchForm({
  email,
  setEmail,
  donationId,
  setDonationId,
  error,
  setError,
  loading,
  onSubmit,
}: Props) {
  const t = useTranslations('trackDonation')

  return (
    <Card padding="lg" elevated className="mb-12">
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-ukraine-blue-500" />
                {t('form.email')}
              </div>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
              placeholder={t('form.emailPlaceholder')}
            />
          </div>

          {/* Donation ID Input */}
          <div>
            <label htmlFor="donationId" className="mb-2 block text-sm font-semibold text-gray-700">
              <div className="flex items-center gap-2">
                <HashIcon className="h-4 w-4 text-ukraine-blue-500" />
                {t('form.donationId')}
              </div>
            </label>
            <input
              id="donationId"
              type="text"
              value={donationId}
              onChange={(e) => {
                setDonationId(e.target.value)
                if (error) setError('')
              }}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition-all placeholder:text-gray-400 hover:border-gray-400 focus:border-transparent focus:ring-2 focus:ring-ukraine-blue-500"
              placeholder={t('form.donationIdPlaceholder')}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="group relative flex w-full transform items-center justify-center gap-2 overflow-hidden rounded-xl bg-ukraine-gold-500 py-4 font-semibold text-ukraine-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-ukraine-gold-600 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></div>
          {loading ? (
            <>
              <div className="relative z-10 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span className="relative z-10">{t('form.searching')}</span>
            </>
          ) : (
            <>
              <SearchIcon className="relative z-10 h-5 w-5" />
              <span className="relative z-10">{t('form.submit')}</span>
            </>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-6 rounded-lg border-l-4 border-warm-500 bg-warm-50 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-warm-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="ml-3 text-sm font-medium text-warm-700">{error}</p>
          </div>
        </div>
      )}
    </Card>
  )
}
