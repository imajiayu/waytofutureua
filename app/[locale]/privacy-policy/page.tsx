import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/constants'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacyPolicy' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates(`/${locale}/privacy-policy`),
  }
}

export default function PrivacyPolicyPage() {
  const t = useTranslations('privacyPolicy')
  const tFooter = useTranslations('footer')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
          {t('title')}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          <strong>{t('effectiveDate')}:</strong> {t('effectiveDateValue')}
        </p>

        <div className="prose prose-gray max-w-none space-y-6">
          {/* Intro */}
          <p className="text-gray-700 leading-relaxed">
            {t('intro')}
          </p>

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 font-display">
              {t('section1.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {t('section1.intro')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>{t('section1.item1')}</li>
              <li>{t('section1.item2')}</li>
              <li>{t('section1.item3')}</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 font-display">
              {t('section2.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {t('section2.intro')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>{t('section2.item1')}</li>
              <li>{t('section2.item2')}</li>
              <li>{t('section2.item3')}</li>
              <li>{t('section2.item4')}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 font-display">
              {t('section3.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section3.content')}
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 font-display">
              {t('section4.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section4.content')}
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 font-display">
              {t('section5.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-3">
              {t('section5.intro')}
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li>{t('section5.item1')}</li>
              <li>{t('section5.item2')}</li>
              <li>{t('section5.item3')}</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 font-display">
              {t('section6.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section6.content')}
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3 font-display">
              {t('section7.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('section7.content')}
            </p>
          </section>

          {/* Section 8 - Contact */}
          <section className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 font-display">
              {t('section8.title')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('section8.intro')}
            </p>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>{t('section8.email')}:</strong> {tFooter('contactInfo.emailValue')}
              </p>
              <p>
                <strong>{t('section8.address')}:</strong> {tFooter('contactInfo.addressValue').replace(/\n/g, ', ')}
              </p>
              <p>
                <strong>{t('section8.phone')}:</strong> {tFooter('contactInfo.phoneValue')}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
