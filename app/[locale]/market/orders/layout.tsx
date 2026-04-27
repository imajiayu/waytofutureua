import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'market' })
  return {
    title: t('order.myOrders'),
    robots: { index: false, follow: false },
  }
}

export default function MarketOrdersLayout({ children }: { children: React.ReactNode }) {
  return children
}
