'use client'

import { useTranslations } from 'next-intl'

interface WechatAlipaySelectorProps {
  amount: number
  onSelect: (type: 'alipay' | 'wxpay') => void
  onBack: () => void
}

function WeChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89l-.407-.033zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
    </svg>
  )
}

function AlipayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.422 15.358c-3.29-1.226-5.867-2.126-7.046-2.752.376-.858.686-1.79.915-2.777h-3.139v-1.298h3.857V7.483H12.15V5.586h-2.14v1.897H6.292v1.048h3.717v1.298H6.292v1.048h8.013c-.172.587-.39 1.14-.644 1.659-1.478-.503-2.94-.8-4.01-.8-2.17 0-3.716 1.13-3.716 2.943 0 1.815 1.545 2.943 3.715 2.943 1.626 0 3.118-.584 4.425-1.664.85.56 1.882 1.108 3.116 1.635 2.024.862 4.18 1.588 4.18 1.588l2.052-3.823s-1.162-.435-2.001-.823zM9.748 16.561c-1.065 0-1.716-.46-1.716-1.258 0-.797.65-1.256 1.716-1.256.912 0 1.916.228 3.003.684-.917.986-1.942 1.83-3.003 1.83z" />
      <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zm0 18.5h-17v-17h17v17z" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  )
}

const wallets: {
  id: 'wxpay' | 'alipay'
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  titleKey: 'wechat' | 'alipay'
}[] = [
  {
    id: 'wxpay',
    icon: <WeChatIcon className="h-8 w-8" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
    borderColor: 'border-green-200 hover:border-green-400',
    titleKey: 'wechat',
  },
  {
    id: 'alipay',
    icon: <AlipayIcon className="h-8 w-8" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    borderColor: 'border-blue-200 hover:border-blue-400',
    titleKey: 'alipay',
  },
]

export default function WechatAlipaySelector({
  amount,
  onSelect,
  onBack,
}: WechatAlipaySelectorProps) {
  const t = useTranslations('wechatAlipaySelector')
  const tDonate = useTranslations('donate')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="mb-2 font-display text-xl font-bold text-gray-900">{t('title')}</h2>
        <p className="inline-block rounded-md bg-ukraine-gold-100 px-3 py-1 text-sm font-semibold text-ukraine-gold-700">
          {t('subtitle')}
        </p>
      </div>

      {/* Amount Display */}
      {(() => {
        const rate = parseFloat(process.env.NEXT_PUBLIC_EPAY_USD_CNY_RATE || '0')
        const cnyAmount = rate > 0 ? Math.round(amount * rate * 100) / 100 : null
        return (
          <div className="rounded-lg border border-life-200 bg-life-50 p-4">
            <div className="text-center">
              <p className="mb-1 text-sm text-gray-600">{tDonate('payment.total')}</p>
              <p className="font-data text-3xl font-bold text-life-600">
                ${amount.toFixed(2)} USD
              </p>
              {cnyAmount && (
                <p className="mt-1 text-sm text-gray-500">
                  ≈ ¥{cnyAmount.toFixed(2)} CNY
                  <span className="ml-1 text-xs text-gray-400">(1 USD = ¥{rate} CNY)</span>
                </p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Wallet Buttons */}
      <div className="space-y-3">
        {wallets.map((wallet) => (
          <button
            key={wallet.id}
            type="button"
            onClick={() => onSelect(wallet.id)}
            className={`w-full rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:shadow-md ${wallet.bgColor} ${wallet.borderColor} cursor-pointer`}
          >
            <div className="flex items-center gap-4">
              <div className={`flex-shrink-0 ${wallet.color}`}>{wallet.icon}</div>
              <div className="flex-1 text-left">
                <p className={`font-semibold ${wallet.color}`}>{t(`${wallet.titleKey}.title`)}</p>
                <p className="text-sm text-gray-500">{t(`${wallet.titleKey}.description`)}</p>
              </div>
              <ArrowRightIcon className={`h-5 w-5 flex-shrink-0 ${wallet.color} opacity-60`} />
            </div>
          </button>
        ))}
      </div>

      {/* Back Button */}
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
      >
        <BackIcon className="h-4 w-4" />
        {t('back')}
      </button>
    </div>
  )
}
