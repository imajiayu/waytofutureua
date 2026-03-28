import { getTranslations } from 'next-intl/server'
import { BASE_URL, getAlternates } from '@/lib/constants'
import { locales } from '@/i18n/config'
import { getPublicMarketItems } from '@/app/actions/market-items'
import MarketItemGrid from '@/components/market/MarketItemGrid'

type Props = {
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'market' })
  const tCommon = await getTranslations({ locale, namespace: 'common' })

  const title = `${t('title')} — ${tCommon('appName')}`
  const description = t('description')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/market`,
    },
    twitter: { title, description },
    alternates: getAlternates(`/${locale}/market`),
  }
}

export default async function MarketPage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'market' })
  const { items } = await getPublicMarketItems()

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* 页面标题 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 font-display">
          {t('title')}
        </h1>
        <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
      </div>

      {/* 商品网格 */}
      <MarketItemGrid items={items} />
    </main>
  )
}
