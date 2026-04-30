import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface FilterBarProps {
  /** Filter inputs / selects rendered inside the bar. */
  children: ReactNode
  /**
   * Optional layout shape. Defaults to `'grid'` which uses
   * `grid grid-cols-1 gap-4 md:grid-cols-3`. Use `'flex'` for inline
   * label+select rows that should wrap on overflow.
   */
  layout?: 'grid' | 'flex'
  className?: string
}

/**
 * Outer card shell for admin filter sections.
 * Picks one of two opinionated inner layouts; for highly custom
 * arrangements pass `layout="flex"` and structure children directly.
 */
export default function FilterBar({ children, layout = 'grid', className }: FilterBarProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4 shadow', className)}>
      <div
        className={cn(
          layout === 'grid'
            ? 'grid grid-cols-1 gap-4 md:grid-cols-3'
            : 'flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3'
        )}
      >
        {children}
      </div>
    </div>
  )
}
