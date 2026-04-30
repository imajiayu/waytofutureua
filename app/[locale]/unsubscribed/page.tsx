/**
 * Unsubscribed Page
 * Displayed after user clicks unsubscribe link from email
 */

import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import UnsubscribedClient from './UnsubscribedClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'unsubscribed' })

  return {
    title: t('title'),
    description: t('message'),
    robots: { index: false, follow: false },
  }
}

export default async function UnsubscribedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { locale } = await params
  const search = await searchParams
  const hasError = search.error === 'true'

  return <UnsubscribedClient locale={locale} hasError={hasError} />
}
