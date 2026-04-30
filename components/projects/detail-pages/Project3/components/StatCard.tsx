'use client'

import { AnimatedNumber } from '@/components/projects/shared'

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  subLabel?: string
  prefix?: string
  colorScheme?: 'gold' | 'pine' | 'berry'
}

export default function StatCard({
  icon: Icon,
  value,
  label,
  subLabel,
  prefix = '',
  colorScheme = 'gold',
}: StatCardProps) {
  const colors = {
    gold: {
      bg: 'from-christmas-gold/20 via-amber-50 to-orange-50',
      border: 'border-christmas-gold/30',
      icon: 'from-christmas-gold to-amber-600',
      text: 'text-christmas-gold-dark',
    },
    pine: {
      bg: 'from-christmas-pine/20 via-emerald-50 to-teal-50',
      border: 'border-christmas-pine/30',
      icon: 'from-christmas-pine to-emerald-700',
      text: 'text-christmas-pine',
    },
    berry: {
      bg: 'from-christmas-berry/20 via-rose-50 to-red-50',
      border: 'border-christmas-berry/30',
      icon: 'from-christmas-berry to-rose-700',
      text: 'text-christmas-berry',
    },
  }
  const c = colors[colorScheme]

  return (
    <div
      className={`relative rounded-xl bg-gradient-to-br p-2.5 md:p-4 ${c.bg} border ${c.border} group overflow-hidden transition-all duration-300 hover:shadow-md`}
    >
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br from-white/60 to-transparent blur-xl" />
      {/* Mobile: vertical stack, Desktop: horizontal */}
      <div className="relative z-10 flex flex-col gap-1.5 md:flex-row md:items-center md:gap-3">
        <div
          className={`h-7 w-7 rounded-lg bg-gradient-to-br md:h-10 md:w-10 ${c.icon} flex flex-shrink-0 items-center justify-center shadow-md transition-transform group-hover:scale-105`}
        >
          <Icon className="h-3.5 w-3.5 text-white md:h-5 md:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`font-data text-lg font-bold md:text-2xl ${c.text} leading-tight`}>
            <AnimatedNumber value={value} prefix={prefix} />
          </div>
          <div className="text-[10px] leading-tight text-gray-600 md:text-xs">{label}</div>
          {subLabel && <div className="text-[10px] text-gray-500">{subLabel}</div>}
        </div>
      </div>
    </div>
  )
}
