import { getTranslations, getLocale } from 'next-intl/server'
import { BASE_URL, getAlternates } from '@/lib/constants'
import { locales } from '@/i18n/config'
import { getAllProjectsWithStats } from '@/lib/supabase/queries'
import DonatePageClient from './DonatePageClient'

// P0 优化: 添加页面缓存，与 ProjectsGrid 保持一致
export const revalidate = 60

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ project?: string }>
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: 'donate' })
  const tMeta = await getTranslations({ locale, namespace: 'metadata' })

  const title = t('title')
  const description = tMeta('donateDescription')

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}/donate`,
    },
    twitter: { title, description },
    alternates: getAlternates(`/${locale}/donate`),
  }
}

export default async function DonatePage(props: Props) {
  const searchParams = await props.searchParams;
  const locale = await getLocale()
  const projects = await getAllProjectsWithStats()

  // Get initial project ID from URL parameter (e.g., from home page "Donate Now" button)
  const initialProjectId = searchParams.project
    ? parseInt(searchParams.project)
    : null

  return (
    <DonatePageClient
      projects={projects}
      locale={locale}
      initialProjectId={initialProjectId}
    />
  )
}
