'use client'

interface ProjectProgressBarProps {
  current: number
  target: number
  unitName?: string
  className?: string
  showAsAmount?: boolean // For aggregated projects, show as dollar amounts
}

export default function ProjectProgressBar({
  current,
  target,
  unitName = '',
  className = '',
  showAsAmount = false,
}: ProjectProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100)
  const isComplete = current >= target

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="font-data text-sm font-semibold tracking-tight">
          {showAsAmount ? (
            <>
              <span className="text-ukraine-gold-600">${current.toLocaleString()}</span>
              <span className="mx-0.5 font-normal text-gray-300">/</span>
              <span className="text-gray-400">${target.toLocaleString()}</span>
            </>
          ) : (
            <>
              <span className="text-ukraine-gold-600">{current}</span>
              <span className="mx-0.5 font-normal text-gray-300">/</span>
              <span className="text-gray-400">{target}</span>
              <span className="ml-1 text-xs font-normal text-gray-400">{unitName}</span>
            </>
          )}
        </span>
        <span
          className={`font-data text-sm font-bold tabular-nums ${
            isComplete ? 'text-life-600' : 'text-ukraine-gold-600'
          }`}
        >
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
        <div
          className={`relative h-full transition-all duration-500 ${
            isComplete
              ? 'bg-gradient-to-r from-life-400 via-life-500 to-life-600'
              : 'bg-gradient-to-r from-ukraine-gold-400 via-ukraine-gold-500 to-ukraine-gold-600'
          }`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </div>
    </div>
  )
}
