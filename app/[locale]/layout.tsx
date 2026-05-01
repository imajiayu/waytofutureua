import '../globals.css'

import { Analytics } from '@vercel/analytics/react'
import type { Metadata, Viewport } from 'next'
import { Fraunces, JetBrains_Mono, Source_Sans_3 } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'

import Footer from '@/components/layout/Footer'
import Navigation from '@/components/layout/Navigation'
import JsonLd from '@/components/seo/JsonLd'
import { locales } from '@/i18n/config'
import { BASE_URL } from '@/lib/constants'
import { isAppLocale } from '@/types'

// 标题字体 - Fraunces 可变字体 (温暖有机的衬线字体)
const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['400', '500', '600', '700', '800', '900'],
})

// 正文字体 - Source Sans 3 (温暖友好的无衬线)
const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  display: 'swap',
  variable: '--font-source-sans',
  weight: ['300', '400', '500', '600', '700'],
})

// 数据字体 - JetBrains Mono (清晰醒目的等宽字体)
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600', '700'],
})

const localeToHtmlLang: Record<string, string> = { ua: 'uk' }

const localeToOgLocale: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  ua: 'uk_UA',
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const params = await props.params

  const { locale } = params

  const t = await getTranslations({ locale, namespace: 'metadata' })
  const tCommon = await getTranslations({ locale, namespace: 'common' })

  const title = tCommon('appName')
  const description = t('homeDescription')

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: `${title} — ${t('titleSuffix')}`,
      template: `%s | ${title}`,
    },
    description,
    icons: {
      icon: [
        { url: '/favicon-128.webp', sizes: '128x128', type: 'image/webp' },
        { url: '/favicon-512.webp', sizes: '512x512', type: 'image/webp' },
      ],
      apple: [{ url: '/favicon-512.webp', sizes: '512x512', type: 'image/webp' }],
    },
    openGraph: {
      siteName: title,
      locale: localeToOgLocale[locale] || 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
    },
    // alternates 由各 page.tsx 自行声明 —— layout 上设置会让所有子路由继承到指向首页的 canonical。
  }
}

// viewport-fit=cover 让内容延伸到iOS安全区域，配合env(safe-area-inset-*)使用
export const viewport: Viewport = {
  viewportFit: 'cover',
}

export const dynamicParams = false

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function RootLayout(props: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const params = await props.params

  const { locale } = params

  const { children } = props

  // Validate locale
  if (!isAppLocale(locale)) {
    notFound()
  }

  // Get messages for the locale
  const messages = await getMessages()

  return (
    <html lang={localeToHtmlLang[locale] || locale}>
      <body
        className={`${fraunces.variable} ${sourceSans.variable} ${jetbrainsMono.variable} font-body antialiased`}
      >
        <JsonLd locale={locale} />
        <NextIntlClientProvider messages={messages}>
          <Navigation />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  )
}
