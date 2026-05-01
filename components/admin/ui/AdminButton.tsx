import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'success' | 'danger'
type Size = 'sm' | 'md'

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children: ReactNode
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50',
  secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50',
  success: 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
}

/**
 * Standardized admin button. Wraps the typical
 * `rounded-md ... transition-colors` pattern used across admin modals.
 */
export default function AdminButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: AdminButtonProps) {
  return (
    <button
      type={type}
      className={cn('rounded-md', SIZE_STYLES[size], VARIANT_STYLES[variant], className)}
      {...rest}
    >
      {children}
    </button>
  )
}
