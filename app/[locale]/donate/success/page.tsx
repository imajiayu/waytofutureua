import { getLocale, getTranslations } from 'next-intl/server'

import { locales } from '@/i18n/config'

import DonationDetails from './DonationDetails'
import SuccessActionButtons from './SuccessActionButtons'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata() {
  const t = await getTranslations('donateSuccess')

  return {
    title: t('title'),
    robots: { index: false, follow: false },
  }
}

export default async function DonateSuccessPage(props: {
  searchParams: Promise<{ order?: string }>
}) {
  const searchParams = await props.searchParams
  const locale = await getLocale()
  const orderReference = searchParams.order

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-4xl px-4 py-12 lg:py-20">
        {/* Donation Details - Client Component with dynamic header */}
        {orderReference && <DonationDetails orderReference={orderReference} locale={locale} />}

        {/* Action Buttons */}
        <SuccessActionButtons />
      </div>
    </div>
  )
}
