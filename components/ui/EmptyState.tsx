import { cn } from '@/lib/utils'

interface EmptyStateProps {
  message: string
  className?: string
}

/**
 * Compact "no results" placeholder for admin tables and lists.
 * Default style: `py-8 text-center text-gray-400`.
 */
export default function EmptyState({ message, className }: EmptyStateProps) {
  return <div className={cn('py-8 text-center text-gray-400', className)}>{message}</div>
}
