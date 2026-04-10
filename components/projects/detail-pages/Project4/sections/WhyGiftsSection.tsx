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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-ukraine-gold-100/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-life-100/40 rounded-full blur-3xl" />
      </div>

      {/* Collapsible Header */}
      {/* Header */}
      <div className="relative mb-4">
        <div className="flex items-end gap-3">
          <span
            className={`
              text-6xl md:text-7xl font-display font-black text-ukraine-gold-400/20 leading-none
              transition-all duration-700 ease-out
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
            style={{ transitionDelay: '0ms' }}
          >
            ?
          </span>
          <h2
            className={`
              font-display text-xl md:text-2xl font-bold text-gray-900 pb-1 flex-1
              transition-all duration-700 ease-out
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
            style={{ transitionDelay: '100ms' }}
          >
            {content.whyGifts.title}
          </h2>
        </div>
        <div
          className={`
            mt-3 h-px bg-gradient-to-r from-ukraine-gold-300 via-ukraine-gold-200 to-transparent
            transition-all duration-1000 ease-out
            ${isVisible ? 'opacity-100 w-full' : 'opacity-0 w-0'}
          `}
          style={{ transitionDelay: '200ms' }}
        />

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            mt-3 flex items-center gap-1.5 group
            transition-all duration-700 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{ transitionDelay: '300ms' }}
        >
          <div className="w-5 h-5 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
          <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">
            {isExpanded
              ? content.whyGifts.title
              : (content.whyGifts.expandHint || content.whyGifts.title)}
          </span>
        </button>
      </div>

      {/* Collapsible Content */}
      <div
        className={`
          overflow-hidden transition-all duration-500 ease-in-out
          ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {/* Cascading cards - domino effect layout */}
        <div className="relative space-y-3">
          {/* Cause Section */}
          <div
            className={`
              relative pl-4 border-l-2 border-ukraine-gold-300
              transition-all duration-700 ease-out
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
            `}
            style={{ transitionDelay: '300ms' }}
          >
            <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-ukraine-gold-400 ring-4 ring-ukraine-gold-100" />
            <p className="text-xs font-semibold uppercase tracking-wider text-ukraine-gold-600 mb-2">
              {content.whyGifts.causeLabel}
            </p>

            {/* First two reasons as cause */}
            <div className="space-y-2">
              <div className="group relative bg-gradient-to-br from-ukraine-gold-50 to-white rounded-xl p-4 border border-ukraine-gold-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-ukraine-gold-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-ukraine-gold-600">1</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pr-8">{reasons[0]}</p>
              </div>

              <div className="group relative bg-gradient-to-br from-warm-50 to-white rounded-xl p-4 border border-warm-200/60 shadow-sm hover:shadow-md transition-shadow duration-300 ml-2">
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-warm-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-warm-600">2</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pr-8">{reasons[1]}</p>
              </div>
            </div>
          </div>

          {/* Arrow connector */}
          <div
            className={`
              flex items-center justify-center py-2
              transition-all duration-700 ease-out
              ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
            `}
            style={{ transitionDelay: '500ms' }}
          >
            <div className="flex flex-col items-center">
              <div className="w-px h-4 bg-gradient-to-b from-warm-300 to-life-300" />
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-ukraine-gold-400 to-life-400 rounded-full blur-md opacity-40" />
                <div className="relative bg-gradient-to-r from-ukraine-gold-500 to-life-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {content.whyGifts.effectLabel}
                </div>
              </div>
              <div className="w-px h-4 bg-gradient-to-b from-life-300 to-life-400" />
            </div>
          </div>

          {/* Effect Section */}
          <div
            className={`
              relative pl-4 border-l-2 border-life-400
              transition-all duration-700 ease-out
              ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
            `}
            style={{ transitionDelay: '600ms' }}
          >
            <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-life-500 ring-4 ring-life-100" />

            <div className="space-y-2">
              <div className="group relative bg-gradient-to-br from-life-50 to-white rounded-xl p-4 border border-life-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-life-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-life-600">3</span>
                </div>
                <p className="text-sm text-life-800 leading-relaxed font-medium pr-8">{reasons[2]}</p>
              </div>

              <div className="group relative bg-gradient-to-br from-life-100 to-life-50 rounded-xl p-4 border border-life-200 shadow-sm hover:shadow-md transition-shadow duration-300 ml-2">
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-life-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-life-700">4</span>
                </div>
                <p className="text-sm text-life-800 leading-relaxed pr-8">{reasons[3]}</p>
              </div>

              {/* Fifth reason if exists - highlighted */}
              {reasons[4] && (
                <div
                  className={`
                    group relative overflow-hidden rounded-xl ml-4
                    transition-all duration-700 ease-out
                    ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{ transitionDelay: '700ms' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-life-500 to-life-600" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
                  <div className="relative p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                      </svg>
                    </div>
                    <p className="text-sm text-white leading-relaxed font-medium pt-1">{reasons[4]}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conclusion - bold statement card */}
        <div
          className={`
            mt-6 relative overflow-hidden rounded-2xl
            transition-all duration-700 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
          style={{ transitionDelay: '800ms' }}
        >
          {/* Background layers */}
          <div className="absolute inset-0 bg-gray-900" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(16,185,129,0.1)_0%,transparent_50%,rgba(245,184,0,0.1)_100%)]" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-life-500/10 rounded-full blur-2xl" />

          {/* Content */}
          <div className="relative p-5 flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-ukraine-gold-400 to-life-500 rounded-xl blur-md opacity-50" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-ukraine-gold-400 to-life-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base md:text-lg font-display font-semibold text-white leading-snug">
                {content.whyGifts.conclusion}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Update */}
      {content.projectUpdate && (
        <div
          className={`
            mt-6 relative overflow-hidden rounded-2xl
            transition-all duration-700 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
          style={{ transitionDelay: '400ms' }}
        >
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white rounded-2xl border border-blue-200/60 p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-blue-900 mb-2">{content.projectUpdate.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{content.projectUpdate.content}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
