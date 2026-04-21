import { getTranslations, getLocale } from 'next-intl/server'
import { BASE_URL, getAlternates } from '@/lib/constants'
import TrackDonationForm from './track-donation-form'
import HeroBackground from './hero-background'

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

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

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center">
          <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase mb-6 text-white bg-white/20 backdrop-blur-sm rounded-full border border-white/30 shadow-lg">
            {t('pageTitle')}
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 inline-block px-6 py-3 bg-black/20 backdrop-blur-sm rounded-lg shadow-lg font-display">
            {t('title')}
          </h1>
          <p className="text-lg sm:text-xl text-white max-w-2xl inline-block px-6 py-3 bg-black/15 backdrop-blur-sm rounded shadow-md font-light">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="relative z-20 max-w-4xl mx-auto px-6 -mt-20">
        <TrackDonationForm locale={locale} />
      </div>
    </div>
  )
}
