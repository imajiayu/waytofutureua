import { getLocale, getTranslations } from 'next-intl/server'

import { BASE_URL, getAlternates } from '@/lib/constants'

import HeroBackground from './hero-background'
import TrackDonationForm from './track-donation-form'

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params

  const { locale } = params

  const t = await getTranslations({ locale, namespace: 'trackDonation' })
  const tMeta = await getTranslations({ locale, namespace: 'metadata' })

  const title = t('pageTitle')
  const description = tMeta('trackDonationDescription')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/track-donation`,
    },
    twitter: { title, description },
    alternates: getAlternates(`/${locale}/track-donation`),
  }
}

export default async function TrackDonationPage() {
  const t = await getTranslations('trackDonation')
  const locale = await getLocale()

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden py-20 pb-32">
        <HeroBackground />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 text-center">
          <span className="mb-6 inline-block rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg backdrop-blur-sm">
            {t('pageTitle')}
          </span>
          <h1 className="mb-6 inline-block rounded-lg bg-black/20 px-6 py-3 font-display text-4xl font-bold text-white shadow-lg backdrop-blur-sm sm:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="inline-block max-w-2xl rounded bg-black/15 px-6 py-3 text-lg font-light text-white shadow-md backdrop-blur-sm sm:text-xl">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="relative z-20 mx-auto -mt-20 max-w-4xl px-6">
        <TrackDonationForm locale={locale} />
      </div>
    </div>
  )
}
