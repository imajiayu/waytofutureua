'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const BG_SRCS = [
  '/images/track-donation/bg-1.webp',
  '/images/track-donation/bg-2.webp',
  '/images/projects/project-4/results/result-12.webp',
]

function preloadImages(srcs: string[]): Promise<void> {
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image()
          img.src = src
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
    )
  ).then(() => {})
}

const MD_BREAKPOINT = 768

export default function HeroBackground() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const isMobile = window.innerWidth < MD_BREAKPOINT
    const srcs = isMobile ? [BG_SRCS[0]] : BG_SRCS
    preloadImages(srcs).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="absolute inset-0 z-0">
      {/* Gradient placeholder — visible until all images are ready */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-amber-900/80 transition-opacity duration-700"
        style={{ opacity: ready ? 0 : 1 }}
      />

      {/* Desktop: Three photos side by side */}
      <div
        className="absolute inset-0 hidden transition-opacity duration-700 md:flex"
        style={{ opacity: ready ? 1 : 0 }}
      >
        {BG_SRCS.map((src) => (
          <div key={src} className="relative h-full w-1/3">
            <Image src={src} alt="" fill className="object-cover" quality={85} priority />
          </div>
        ))}
      </div>

      {/* Mobile: Single first photo */}
      <div
        className="absolute inset-0 transition-opacity duration-700 md:hidden"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Image src={BG_SRCS[0]} alt="" fill className="object-cover" quality={85} priority />
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  )
}
