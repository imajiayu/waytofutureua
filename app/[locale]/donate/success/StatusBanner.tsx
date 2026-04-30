type StatusBannerProps = {
  type: 'failed' | 'processing' | 'success'
  title: string
  description: string
  amount: number
  amountLabel: string
}

const STATUS_STYLES = {
  failed: {
    container: 'bg-warm-50 border-l-4 border-warm-500',
    icon: 'text-warm-600',
    title: 'text-warm-900',
    description: 'text-warm-800',
    amount: 'text-warm-700',
  },
  processing: {
    container: 'bg-ukraine-gold-50 border-l-4 border-ukraine-gold-400',
    icon: 'text-ukraine-gold-600',
    title: 'text-ukraine-gold-900',
    description: 'text-ukraine-gold-800',
    amount: 'text-ukraine-gold-700',
  },
  success: {
    container: 'bg-life-50 border-l-4 border-life-500',
    icon: 'text-life-600',
    title: 'text-life-900',
    description: 'text-life-800',
    amount: 'text-life-700',
  },
} as const

const STATUS_ICONS = {
  failed: (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),
  processing: (
    <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  ),
  success: (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),
} as const

export default function StatusBanner({
  type,
  title,
  description,
  amount,
  amountLabel,
}: StatusBannerProps) {
  const styles = STATUS_STYLES[type]
  const icon = STATUS_ICONS[type]

  return (
    <div className={`${styles.container} rounded-lg p-6`}>
      <div className="flex items-start gap-3">
        <div className={`${styles.icon} mt-0.5 flex-shrink-0`}>{icon}</div>
        <div className="flex-1">
          <h3 className={`font-bold ${styles.title} mb-1 font-display text-lg`}>{title}</h3>
          <p className={`text-sm ${styles.description} mb-3`}>{description}</p>
          <div className={`text-sm ${styles.amount}`}>
            <span className="font-medium">{amountLabel}</span>{' '}
            {type === 'success' ? (
              <span className="font-data text-xl font-bold text-life-900">
                ${amount.toFixed(2)}
              </span>
            ) : (
              <span className="font-data">${amount.toFixed(2)}</span>
            )}{' '}
            USD
          </div>
        </div>
      </div>
    </div>
  )
}
