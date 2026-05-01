import { useTranslations } from 'next-intl'

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  waiting: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: (
      <svg className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  confirming: {
    color: 'text-ukraine-blue-600',
    bgColor: 'bg-ukraine-blue-50 border-ukraine-blue-200',
    icon: (
      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
  },
  confirmed: {
    color: 'text-ukraine-blue-600',
    bgColor: 'bg-ukraine-blue-50 border-ukraine-blue-200',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  sending: {
    color: 'text-ukraine-gold-700',
    bgColor: 'bg-ukraine-gold-50 border-ukraine-gold-200',
    icon: (
      <svg className="h-5 w-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  finished: {
    color: 'text-life-700',
    bgColor: 'bg-life-50 border-life-200',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
}

export default function CryptoStatusIndicator({ status }: { status: string }) {
  const t = useTranslations('nowpaymentsWidget')
  const config = statusConfig[status] || statusConfig.waiting
  const statusKey = status as keyof typeof statusConfig

  return (
    <div className={`rounded-lg border p-4 ${config.bgColor}`}>
      <div className={`flex items-center gap-3 ${config.color}`}>
        {config.icon}
        <span className="font-medium">{t(`status.${statusKey}` as any)}</span>
      </div>
    </div>
  )
}
