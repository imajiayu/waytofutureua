'use client'

import type { SectionProps } from '../types'

export default function IntroductionSection({ content }: Pick<SectionProps, 'content'>) {
  return (
    <section className="max-w-3xl">
      {/* Decorative Quote Mark */}
      <div className="mb-1 select-none font-serif text-5xl leading-none text-ukraine-blue-200 md:text-6xl">
        &ldquo;
      </div>
      {content.introduction.map((paragraph, idx) => (
        <p key={idx} className="text-sm leading-relaxed text-gray-700 md:text-base">
          {paragraph}
        </p>
      ))}
    </section>
  )
}
