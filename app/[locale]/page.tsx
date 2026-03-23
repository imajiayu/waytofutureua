import { Suspense } from 'react'
import { readFile } from 'fs/promises'
import path from 'path'
import { getTranslations } from 'next-intl/server'
import { BASE_URL, getAlternates } from '@/lib/constants'
import { locales } from '@/i18n/config'
import ProjectsGrid from '@/components/projects/ProjectsGrid'
import MissionSection from '@/components/home/MissionSection'
import ApproachSection from '@/components/home/ApproachSection'
import ImpactSection from '@/components/home/ImpactSection'
import DonationJourneySection from '@/components/home/DonationJourneySection'
import ComplianceSection from '@/components/home/ComplianceSection'
import ProjectResultsSection from '@/components/home/ProjectResultsSection'
import type { ProjectResult } from '@/types'
import { logger } from '@/lib/logger'

type Props = {
  params: { locale: string }
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const tMeta = await getTranslations({ locale, namespace: 'metadata' })
  const tCommon = await getTranslations({ locale, namespace: 'common' })

  const title = tCommon('appName')
  const description = tMeta('homeDescription')

  return {
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${locale}`,
    },
    twitter: { title, description },
    alternates: getAlternates(`/${locale}`),
  }
}

export default async function Home({ params }: Props) {
  const t = await getTranslations('home.hero.projects')
  const { locale } = params

  // Load home marquee results from dedicated JSON file
  const projectResults: ProjectResult[] = []
  try {
    const filePath = path.join(process.cwd(), 'public', 'content', 'home', `marquee-${locale}.json`)
    const fileContent = await readFile(filePath, 'utf-8')
    const data = JSON.parse(fileContent)
    if (data.results && data.results.length > 0) {
      projectResults.push(...data.results)
    }
  } catch (error) {
    logger.errorWithStack('DB', 'Error loading home marquee', error)
  }

  return (
    <div className="w-full">
      {/* Section 1: Mission */}
      <MissionSection />

      {/* Section 2: Approach */}
      <ApproachSection />

      {/* Section 3: Impact */}
      <ImpactSection />

      {/* Wrapper for Projects, Results, Journey, Compliance sections */}
      <div className="bg-gradient-to-b from-white from-80% to-ukraine-blue-50">
        {/* Section 4: Projects */}
        <section id="projects-section" className="relative flex items-center justify-center pt-12 md:pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            {/* Header */}
            <div className="text-center mb-8 md:mb-10">
              <span className="inline-block px-4 py-1.5 text-xs font-bold tracking-widest uppercase bg-ukraine-gold-500 text-ukraine-blue-900 rounded-full mb-3">
                {t('label')}
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 font-display">
                {t('title')}
              </h2>
            </div>

            {/* Projects Grid */}
            <Suspense fallback={
              <div className="w-full">
                <div className="overflow-x-auto pb-4 pt-2 scrollbar-hide">
                  <div className="flex gap-6 min-w-min px-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-[300px] md:w-[350px] h-[400px] bg-gray-100 rounded-2xl animate-pulse flex-shrink-0" />
                    ))}
                  </div>
                </div>
              </div>
            }>
              <ProjectsGrid />
            </Suspense>
          </div>
        </section>

        {/* Section 5: Project Results */}
        <ProjectResultsSection results={projectResults} locale={locale} />

        {/* Section 6: Donation Journey */}
        <DonationJourneySection />

        {/* Section 7: Legal Compliance */}
        <ComplianceSection />
      </div>
    </div>
  )
}
