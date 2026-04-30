import { ReactNode } from 'react'

type InfoCardProps = {
  variant: 'blue' | 'purple' | 'yellow'
  title: string
  description: string | ReactNode
  icon?: ReactNode
}

const VARIANT_STYLES = {
  blue: {
    bg: 'bg-ukraine-blue-50',
    border: 'border-ukraine-blue-200',
    borderStyle: 'border',
    title: 'text-ukraine-blue-900',
    description: 'text-ukraine-blue-800',
    icon: 'text-ukraine-blue-500',
  },
  purple: {
    bg: 'bg-ukraine-gold-50',
    border: 'border-ukraine-gold-200',
    borderStyle: 'border',
    title: 'text-ukraine-gold-900',
    description: 'text-ukraine-gold-800',
    icon: 'text-ukraine-gold-500',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    borderStyle: 'border-l-4',
    title: 'text-yellow-900',
    description: 'text-yellow-800',
    icon: 'text-yellow-600',
  },
} as const

export default function InfoCard({ variant, title, description, icon }: InfoCardProps) {
  const styles = VARIANT_STYLES[variant]
  const borderClass = styles.borderStyle

  return (
    <div
      className={`${styles.bg} ${borderClass} ${styles.border} rounded-lg p-${icon ? '6' : '5'}`}
    >
      {icon ? (
        <div className="flex items-start gap-3">
          <div className={`${styles.icon} mt-0.5 flex-shrink-0`}>{icon}</div>
          <div>
            <h4 className={`font-semibold ${styles.title} mb-1 font-display`}>{title}</h4>
            <div className={`text-sm ${styles.description}`}>{description}</div>
          </div>
        </div>
      ) : (
        <>
          <h4 className={`font-semibold ${styles.title} mb-2 font-display`}>{title}</h4>
          <div className={`text-sm ${styles.description}`}>{description}</div>
        </>
      )}
    </div>
  )
}
