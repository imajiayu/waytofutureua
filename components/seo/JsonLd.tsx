import { getTranslations } from 'next-intl/server'
import { BASE_URL } from '@/lib/constants'

/** 安全序列化 JSON-LD：转义 </ 防止 script 注入 */
function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

const localeLanguages: Record<string, { code: string; name: string }> = {
  en: { code: 'en', name: 'English' },
  zh: { code: 'zh', name: 'Chinese' },
  ua: { code: 'uk', name: 'Ukrainian' },
}

export default async function JsonLd({ locale }: { locale: string }) {
  const tMeta = await getTranslations({ locale, namespace: 'metadata' })
  const tNav = await getTranslations({ locale, namespace: 'navigation' })

  // Organization — tells Google who you are (NGO with logo, contacts, social)
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': `${BASE_URL}/#organization`,
    name: 'WAY TO FUTURE UA',
    alternateName: 'Шлях до Здоров\'я',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/images/logo.svg`,
    },
    description: tMeta('orgDescription'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'St. Heroes of Ukraine, 27c, Slobozhanske village',
      addressLocality: 'Dnipro',
      addressRegion: 'Dnipropetrovsk region',
      postalCode: '52005',
      addressCountry: 'UA',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Ukraine',
    },
  }

  // WebSite — enables sitelinks search box and tells Google about the site
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    url: BASE_URL,
    name: 'WAY TO FUTURE UA',
    publisher: { '@id': `${BASE_URL}/#organization` },
    inLanguage: Object.values(localeLanguages).map(({ code, name }) => ({
      '@type': 'Language',
      name,
      alternateName: code,
    })),
  }

  // SiteNavigationElement — hints to Google which pages to show as sitelinks
  const siteNav = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: [
      {
        '@type': 'SiteNavigationElement',
        position: 1,
        name: tNav('donate'),
        url: `${BASE_URL}/${locale}/donate`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 2,
        name: tNav('trackDonation'),
        url: `${BASE_URL}/${locale}/track-donation`,
      },
      {
        '@type': 'SiteNavigationElement',
        position: 3,
        name: tNav('projects'),
        url: `${BASE_URL}/${locale}#projects-section`,
      },
    ],
  }

  // All data is static/hardcoded — no user input, safe to serialize
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(siteNav) }}
      />
    </>
  )
}
