'use client'

import { useTranslations } from 'next-intl'

import { CheckCircle2Icon } from '@/components/icons'
import { MAIN_FLOW_STATUSES } from '@/lib/donation-status'

interface DonationStatusFlowProps {
  className?: string
}

// UI display stage keys (for i18n translation lookup, not business status values)
const MAIN_STAGE_KEYS = MAIN_FLOW_STATUSES
const REFUND_STAGE_KEYS = ['refund_pending', 'refund_done'] as const

export default function DonationStatusFlow({ className = '' }: DonationStatusFlowProps) {
  const t = useTranslations('donationStatusFlow')

  return (
    <div className={`w-full ${className}`}>
      {/* 两行布局 */}
      <div className="relative pb-1">
        {/* 第一行：主流程 */}
        <div className="relative mb-28 flex items-start justify-between sm:mb-32 md:mb-24">
          {MAIN_STAGE_KEYS.map((stageKey, index) => (
            <div key={stageKey} className="relative flex flex-1 flex-col items-center">
              {/* 连接线 */}
              {index < MAIN_STAGE_KEYS.length - 1 && (
                <div
                  className="absolute left-1/2 top-3 h-0.5 w-full bg-life-500"
                  style={{ zIndex: 0 }}
                />
              )}
              {/* 图标 */}
              <div className="relative z-10 rounded-full border border-life-200 bg-gradient-to-br from-life-50 to-white p-2 shadow-sm">
                <CheckCircle2Icon className="h-5 w-5 text-life-600" />
              </div>
              {/* 标题 */}
              <div className="mt-2 px-1 text-center text-gray-700">
                <div className="break-words text-xs font-medium sm:text-sm">
                  {t(`stages.${stageKey}.title`)}
                </div>
                <div className="mt-1 break-words text-xs text-gray-500">
                  {t(`stages.${stageKey}.timeframe`)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 第二行：退款流程 */}
        <div className="absolute left-0 right-0 top-28 sm:top-32 md:top-24">
          <div className="relative flex items-start">
            {/* refund_pending */}
            <div className="relative flex flex-1 flex-col items-center">
              <div className="relative z-10 rounded-full border border-warm-200 bg-gradient-to-br from-warm-50 to-white p-2 shadow-sm">
                <CheckCircle2Icon className="h-5 w-5 text-warm-600" />
              </div>
              <div className="mt-2 px-1 text-center text-gray-700">
                <div className="break-words text-xs font-medium sm:text-sm">
                  {t('stages.refund_pending.title')}
                </div>
                <div className="mt-1 break-words text-xs text-gray-500">
                  {t('stages.refund_pending.timeframe')}
                </div>
              </div>
            </div>

            <div className="flex-1" />

            {/* refund_done */}
            <div className="relative flex flex-1 flex-col items-center">
              <div
                className="absolute right-1/2 top-3 h-0.5 w-[200%] bg-warm-500"
                style={{ zIndex: 0 }}
              />
              <div className="relative z-10 rounded-full border border-warm-200 bg-gradient-to-br from-warm-50 to-white p-2 shadow-sm">
                <CheckCircle2Icon className="h-5 w-5 text-warm-600" />
              </div>
              <div className="mt-2 px-1 text-center text-gray-700">
                <div className="break-words text-xs font-medium sm:text-sm">
                  {t('stages.refund_done.title')}
                </div>
                <div className="mt-1 break-words text-xs text-gray-500">
                  {t('stages.refund_done.timeframe')}
                </div>
              </div>
            </div>

            <div className="flex-1" />
          </div>
        </div>
      </div>

      {/* 描述卡片 */}
      <div className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 md:mt-12 md:grid-cols-2 lg:grid-cols-3">
        {MAIN_STAGE_KEYS.map((stageKey) => (
          <div key={stageKey} className="rounded-lg border border-life-200 bg-life-50/30 p-4">
            <h4 className="mb-2 font-display font-semibold text-life-800">
              {t(`stages.${stageKey}.title`)}
            </h4>
            <p className="text-sm text-gray-600">{t(`stages.${stageKey}.description`)}</p>
          </div>
        ))}

        {REFUND_STAGE_KEYS.map((stageKey) => (
          <div key={stageKey} className="rounded-lg border border-warm-200 bg-warm-50 p-4">
            <h4 className="mb-2 font-display font-semibold text-warm-800">
              {t(`stages.${stageKey}.title`)}
            </h4>
            <p className="text-sm text-gray-600">{t(`stages.${stageKey}.description`)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
