import { cn } from '@/lib/utils'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  elevated?: boolean
  bordered?: boolean
}

export default function Card({
  padding = 'md',
  elevated = false,
  bordered = true,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white',
        PADDING_CLASSES[padding],
        bordered && 'border border-gray-100',
        elevated && 'shadow-xl',
        className
      )}
      {...rest}
    />
  )
}
