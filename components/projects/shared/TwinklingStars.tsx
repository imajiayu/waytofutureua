'use client'

import { useMemo } from 'react'

// Deterministic pseudo-random based on seed to avoid hydration mismatch
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000
  return x - Math.floor(x)
}

interface TwinklingStarsProps {
  count?: number
}

export default function TwinklingStars({ count = 6 }: TwinklingStarsProps) {
  const stars = useMemo(
    () =>
      [...Array(count)].map((_, i) => ({
        left: 10 + seededRandom(i * 4 + 1) * 80,
        top: 10 + seededRandom(i * 4 + 2) * 60,
        delay: seededRandom(i * 4 + 3) * 3,
        size: 8 + seededRandom(i * 4 + 4) * 4,
      })),
    [count]
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute text-christmas-gold/40 animate-twinkle"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
            fontSize: `${star.size}px`,
          }}
        >
          ✦
        </div>
      ))}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
