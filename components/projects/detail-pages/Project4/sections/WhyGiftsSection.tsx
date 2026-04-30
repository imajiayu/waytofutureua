'use client'

import { useEffect, useRef, useState } from 'react'

import type { SectionProps } from '../types'

export default function WhyGiftsSection({ content }: SectionProps) {
  const reasons = content.whyGifts.reasons
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-ukraine-gold-100/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-life-100/40 blur-3xl" />
      </div>

      {/* Collapsible Header */}
      {/* Header */}
      <div className="relative mb-4">
        <div className="flex items-end gap-3">
          <span
            className={`font-display text-6xl font-black leading-none text-ukraine-gold-400/20 transition-all duration-700 ease-out md:text-7xl ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} `}
            style={{ transitionDelay: '0ms' }}
          >
            ?
          </span>
          <h2
            className={`flex-1 pb-1 font-display text-xl font-bold text-gray-900 transition-all duration-700 ease-out md:text-2xl ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} `}
            style={{ transitionDelay: '100ms' }}
          >
            {content.whyGifts.title}
          </h2>
        </div>
        <div
          className={`mt-3 h-px bg-gradient-to-r from-ukraine-gold-300 via-ukraine-gold-200 to-transparent transition-all duration-1000 ease-out ${isVisible ? 'w-full opacity-100' : 'w-0 opacity-0'} `}
          style={{ transitionDelay: '200ms' }}
        />

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`group mt-3 flex items-center gap-1.5 transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} `}
          style={{ transitionDelay: '300ms' }}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 transition-colors group-hover:bg-gray-200">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`h-3 w-3 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <span className="text-xs text-gray-400 transition-colors group-hover:text-gray-500">
            {isExpanded
              ? content.whyGifts.title
              : content.whyGifts.expandHint || content.whyGifts.title}
          </span>
        </button>
      </div>

      {/* Collapsible Content */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} `}
      >
        {/* Cascading cards - domino effect layout */}
        <div className="relative space-y-3">
          {/* Cause Section */}
          <div
            className={`relative border-l-2 border-ukraine-gold-300 pl-4 transition-all duration-700 ease-out ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'} `}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-ukraine-gold-400 ring-4 ring-ukraine-gold-100" />
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ukraine-gold-600">
              {content.whyGifts.causeLabel}
            </p>

            {/* First two reasons as cause */}
            <div className="space-y-2">
              <div className="group relative rounded-xl border border-ukraine-gold-200/60 bg-gradient-to-br from-ukraine-gold-50 to-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-ukraine-gold-100">
                  <span className="text-xs font-bold text-ukraine-gold-600">1</span>
                </div>
                <p className="pr-8 text-sm leading-relaxed text-gray-700">{reasons[0]}</p>
              </div>

              <div className="group relative ml-2 rounded-xl border border-warm-200/60 bg-gradient-to-br from-warm-50 to-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-warm-100">
                  <span className="text-xs font-bold text-warm-600">2</span>
                </div>
                <p className="pr-8 text-sm leading-relaxed text-gray-700">{reasons[1]}</p>
              </div>
            </div>
          </div>

          {/* Arrow connector */}
          <div
            className={`flex items-center justify-center py-2 transition-all duration-700 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'} `}
            style={{ transitionDelay: '500ms' }}
          >
            <div className="flex flex-col items-center">
              <div className="h-4 w-px bg-gradient-to-b from-warm-300 to-life-300" />
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-ukraine-gold-400 to-life-400 opacity-40 blur-md" />
                <div className="relative rounded-full bg-gradient-to-r from-ukraine-gold-500 to-life-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  {content.whyGifts.effectLabel}
                </div>
              </div>
              <div className="h-4 w-px bg-gradient-to-b from-life-300 to-life-400" />
            </div>
          </div>

          {/* Effect Section */}
          <div
            className={`relative border-l-2 border-life-400 pl-4 transition-all duration-700 ease-out ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'} `}
            style={{ transitionDelay: '600ms' }}
          >
            <div className="absolute -left-[7px] top-0 h-3 w-3 rounded-full bg-life-500 ring-4 ring-life-100" />

            <div className="space-y-2">
              <div className="group relative rounded-xl border border-life-200/60 bg-gradient-to-br from-life-50 to-white p-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-life-100">
                  <span className="text-xs font-bold text-life-600">3</span>
                </div>
                <p className="pr-8 text-sm font-medium leading-relaxed text-life-800">
                  {reasons[2]}
                </p>
              </div>

              <div className="group relative ml-2 rounded-xl border border-life-200 bg-gradient-to-br from-life-100 to-life-50 p-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-life-200">
                  <span className="text-xs font-bold text-life-700">4</span>
                </div>
                <p className="pr-8 text-sm leading-relaxed text-life-800">{reasons[3]}</p>
              </div>

              {/* Fifth reason if exists - highlighted */}
              {reasons[4] && (
                <div
                  className={`group relative ml-4 overflow-hidden rounded-xl transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} `}
                  style={{ transitionDelay: '700ms' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-life-500 to-life-600" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
                  <div className="relative flex items-start gap-3 p-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                      </svg>
                    </div>
                    <p className="pt-1 text-sm font-medium leading-relaxed text-white">
                      {reasons[4]}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conclusion - bold statement card */}
        <div
          className={`relative mt-6 overflow-hidden rounded-2xl transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} `}
          style={{ transitionDelay: '800ms' }}
        >
          {/* Background layers */}
          <div className="absolute inset-0 bg-gray-900" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.1)_0%,transparent_50%,rgba(245,184,0,0.1)_100%)]" />
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-life-500/10 blur-2xl" />

          {/* Content */}
          <div className="relative flex items-center gap-4 p-5">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-ukraine-gold-400 to-life-500 opacity-50 blur-md" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-ukraine-gold-400 to-life-500 shadow-lg">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="h-6 w-6 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold leading-snug text-white md:text-lg">
                {content.whyGifts.conclusion}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Update */}
      {content.projectUpdate && (
        <div
          className={`relative mt-6 overflow-hidden rounded-2xl transition-all duration-700 ease-out ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} `}
          style={{ transitionDelay: '400ms' }}
        >
          <div className="rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 text-sm font-bold text-blue-900">
                  {content.projectUpdate.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-700">
                  {content.projectUpdate.content}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
