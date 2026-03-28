import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { BASE_URL } from '@/lib/constants'
import { getMarketItemById } from '@/app/actions/market-items'
import { getTranslatedText, type SupportedLocale } from '@/lib/i18n-utils'
import MarketItemDetail from '@/components/market/MarketItemDetail'

type Props = {
  params: Promise<{ locale: string; itemId: string }>
}

export async function generateMetadata({ params }: Props) {
  const { locale, itemId } = await params
  const { item } = await getMarketItemById(Number(itemId))
  if (!item) return {}

  const title = getTranslatedText(item.title_i18n, locale as SupportedLocale) || 'Item'
  const tCommon = await getTranslations({ locale, namespace: 'common' })

  return {
    title: `${title} — ${tCommon('appName')}`,
    openGraph: {
      title,
      url: `${BASE_URL}/${locale}/market/${itemId}`,
    },
  }
}

export default async function MarketItemPage({ params }: Props) {
  const { locale, itemId } = await params
  const id = Number(itemId)

  if (isNaN(id)) notFound()

  const { item, error } = await getMarketItemById(id)

  if (!item || error === 'not_found') notFound()

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <MarketItemDetail item={item} locale={locale} />
    </main>
  )
}
