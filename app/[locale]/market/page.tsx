import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
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
    <main>
      {/* Hero — 全宽深蓝背景，紧接导航栏 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ukraine-blue-900 via-ukraine-blue-800 to-ukraine-blue-700">
        {/* 点阵纹理 */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1' fill='white'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          {/* 标签 */}
          <p className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.3em] uppercase text-ukraine-gold-300/90 mb-4 sm:mb-5">
            <span className="block w-6 sm:w-8 h-px bg-ukraine-gold-400/40" aria-hidden="true" />
            {t('hero.tagline')}
            <span className="block w-6 sm:w-8 h-px bg-ukraine-gold-400/40" aria-hidden="true" />
          </p>

          {/* 主体 — 桌面端左右分列 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            {/* 左侧：标题 + 副标题 */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-display text-white leading-tight tracking-tight">
                {t('title')}
              </h1>
              <p className="mt-3 text-base sm:text-lg text-ukraine-blue-200/80 leading-relaxed max-w-xl">
                {t('hero.subtitle')}
              </p>
            </div>

            {/* 右侧：订单按钮 */}
            <Link
              href="/market/orders"
              className="group flex-shrink-0 self-center sm:self-auto inline-flex items-center gap-2.5 px-7 py-3 text-sm font-bold tracking-wide text-ukraine-blue-900 bg-ukraine-gold-400 rounded-xl shadow-lg shadow-ukraine-gold-400/25 hover:bg-ukraine-gold-300 hover:shadow-xl hover:shadow-ukraine-gold-300/30 transition-all duration-200"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              {t('order.myOrders')}
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          {/* 信任指标 */}
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center sm:justify-start gap-x-5 sm:gap-x-8 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-ukraine-blue-200/70">
              <svg className="w-4 h-4 text-ukraine-gold-400/80 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              {t('hero.trust.usage.title')}
            </span>
            <span className="hidden sm:block w-px h-3.5 bg-white/15" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-sm text-ukraine-blue-200/70">
              <svg className="w-4 h-4 text-ukraine-gold-400/80 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              {t('hero.trust.proof.title')}
            </span>
            <span className="hidden sm:block w-px h-3.5 bg-white/15" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-sm text-ukraine-blue-200/70">
              <svg className="w-4 h-4 text-ukraine-gold-400/80 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
              </svg>
              {t('hero.trust.tracking.title')}
            </span>
          </div>
        </div>

        {/* 底部金色高光线 */}
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-ukraine-gold-400/20 to-transparent" />
      </section>

      {/* 商品网格 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <MarketItemGrid items={items} />
      </div>
    </main>
  )
}
