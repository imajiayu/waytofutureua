import { getTranslations } from 'next-intl/server'

export default async function ComplianceSection() {
  const t = await getTranslations('home.hero.compliance')

  const documents = [
    { key: 'registration', file: '非营利组织登记册摘录.pdf' },
    { key: 'charter', file: '章程.pdf' },
    { key: 'edrpou', file: 'ЄДРПОУ 登记信息证明（带公章）.pdf' },
    { key: 'application', file: '申请获取〈非营利组织登记册摘录〉的申请文件.pdf' },
    { key: 'procurement', file: '采购管理政策.pdf' },
    { key: 'conflict', file: '利益冲突政策.pdf' },
    { key: 'accounting', file: '会计政策.pdf' },
    { key: 'info', file: '登记信息摘录.pdf' },
  ]

  return (
    <section id="compliance-section" className="relative py-12 md:py-16">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="mb-3 font-display text-3xl font-bold text-gray-900 sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mx-auto max-w-2xl text-base font-light text-gray-600 sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Documents Grid - Single Row */}
        <div className="overflow-x-auto pb-4 pt-2">
          <div className="flex min-w-min gap-4 px-2">
            {documents.map(({ key, file }) => (
              <a
                key={key}
                href={`/documents/${encodeURIComponent(file)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group w-48 flex-shrink-0 transform rounded-xl border-2 border-gray-200 bg-white p-4 transition-all duration-300 hover:-translate-y-2 hover:border-ukraine-blue-500 hover:shadow-lg"
              >
                {/* PDF Icon */}
                <div className="mb-3 flex justify-center">
                  <div className="rounded-lg border border-warm-200 bg-warm-50 p-3 transition-colors group-hover:bg-warm-100">
                    <svg className="h-8 w-8 text-warm-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* Document Name */}
                <p className="line-clamp-3 text-center text-sm font-medium leading-tight text-gray-900 transition-colors group-hover:text-ukraine-blue-500">
                  {t(`documents.${key}` as any)}
                </p>

                {/* Download Indicator */}
                <div className="mt-3 flex justify-center">
                  <span className="text-xs text-gray-500 transition-colors group-hover:text-ukraine-blue-500">
                    PDF
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Scroll Hint (Mobile) */}
        <div className="mt-4 text-center md:hidden">
          <p className="flex items-center justify-center text-sm text-gray-500">
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
            {t('scrollHint')}
          </p>
        </div>
      </div>
    </section>
  )
}
