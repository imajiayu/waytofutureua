import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { getAlternates } from '@/lib/constants'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'publicAgreement' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates(`/${locale}/public-agreement`),
  }
}

export default function PublicAgreementPage() {
  const t = useTranslations('publicAgreement')

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm md:p-12">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase text-gray-900 md:text-3xl">
          {t('mainTitle')}
        </h1>

        <p className="mb-8 leading-relaxed text-gray-700">{t('intro')}</p>

        <div className="prose prose-gray max-w-none space-y-6">
          {/* Section 1: Definitions */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section1.title')}
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-700">
                  <strong>{t('section1.publicOffer.term')}</strong> —{' '}
                  {t('section1.publicOffer.definition')}
                </p>
              </div>
              <div>
                <p className="text-gray-700">
                  <strong>{t('section1.acceptance.term')}</strong> —{' '}
                  {t('section1.acceptance.definition')}
                </p>
              </div>
              <div>
                <p className="text-gray-700">
                  <strong>{t('section1.donation.term')}</strong> —{' '}
                  {t('section1.donation.definition')}
                </p>
              </div>
              <div>
                <p className="text-gray-700">
                  <strong>{t('section1.seller.term')}</strong> — {t('section1.seller.definition')}
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Subject */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section2.title')}
            </h2>
            <p className="leading-relaxed text-gray-700">{t('section2.content')}</p>
          </section>

          {/* Section 3: Acceptance */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section3.title')}
            </h2>
            <p className="leading-relaxed text-gray-700">{t('section3.content')}</p>
          </section>

          {/* Section 4: Foundation Rights & Obligations */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section4.title')}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 font-semibold text-gray-900">{t('section4.rightsTitle')}</p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
                  <li>{t('section4.right1')}</li>
                  <li>{t('section4.right2')}</li>
                  <li>{t('section4.right3')}</li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-gray-900">{t('section4.obligationsTitle')}</p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
                  <li>{t('section4.obligation1')}</li>
                  <li>{t('section4.obligation2')}</li>
                  <li>{t('section4.obligation3')}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: Donor Rights & Obligations */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section5.title')}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 font-semibold text-gray-900">{t('section5.rightsTitle')}</p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
                  <li>{t('section5.right1')}</li>
                  <li>{t('section5.right2')}</li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-gray-900">{t('section5.obligationsTitle')}</p>
                <ul className="ml-4 list-inside list-disc space-y-2 text-gray-700">
                  <li>{t('section5.obligation1')}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 6: Place and Terms */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section6.title')}
            </h2>
            <p className="leading-relaxed text-gray-700">{t('section6.content')}</p>
          </section>

          {/* Section 7: Methods */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section7.title')}
            </h2>
            <p className="mb-3 leading-relaxed text-gray-700">{t('section7.content')}</p>
          </section>

          {/* Section 8: Use of Donations */}
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section8.title')}
            </h2>
            <p className="leading-relaxed text-gray-700">{t('section8.content')}</p>
          </section>

          {/* Section 9: Contact */}
          <section className="rounded-lg border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 font-display text-xl font-semibold text-gray-900">
              {t('section9.title')}
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>{t('section9.name')}:</strong> {t('section9.nameValue')}
              </p>
              <p>
                <strong>{t('section9.address')}:</strong> {t('section9.addressValue')}
              </p>
              <p>
                <strong>{t('section9.website')}:</strong>{' '}
                <a
                  href={t('section9.websiteValue')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ukraine-blue-500 underline hover:text-ukraine-blue-600"
                >
                  {t('section9.websiteValue')}
                </a>
              </p>
              <p>
                <strong>{t('section9.email')}:</strong> {t('section9.emailValue')}
              </p>
              <p>
                <strong>{t('section9.phone')}:</strong> {t('section9.phoneValue')}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
