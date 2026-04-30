import { cn } from '@/lib/utils'

type BadgeSize = 'sm' | 'md'

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-xs',
}

export interface BadgeColor {
  bg: string
  text: string
  border?: string
}

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** Tailwind color trio. Use `bordered` to enable the border ring. */
  color: BadgeColor
  size?: BadgeSize
  bordered?: boolean
}

export default function Badge({
  color,
  size = 'md',
  bordered = false,
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        SIZE_CLASSES[size],
        color.bg,
        color.text,
        bordered && 'border',
        bordered && color.border,
        className
      )}
      {...rest}
    />
  )
}
