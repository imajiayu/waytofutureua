'use client'

import { useTranslations } from 'next-intl'

import { ChevronDownIcon, GiftIcon } from '@/components/icons'

import type { GiftList } from '../types'

interface GiftListAccordionProps {
  giftList: GiftList
  isExpanded: boolean
  onToggle: () => void
}

export default function GiftListAccordion({
  giftList,
  isExpanded,
  onToggle,
}: GiftListAccordionProps) {
  const t = useTranslations('projects')

  return (
    <div
      className={`overflow-hidden rounded-xl transition-all duration-300 ${isExpanded ? 'border border-christmas-gold/30 bg-gradient-to-br from-christmas-cream to-amber-50/50 shadow-md' : 'border border-gray-100 bg-white shadow-sm hover:border-christmas-gold/20'}`}
    >
      <button
        onClick={onToggle}
        className="group flex w-full items-center justify-between px-3 py-2.5"
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${isExpanded ? 'bg-gradient-to-br from-christmas-gold to-amber-500 shadow-md' : 'bg-gradient-to-br from-christmas-berry/80 to-rose-500 shadow-sm group-hover:scale-105'}`}
          >
            <GiftIcon className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-sm font-bold text-gray-900">{giftList.shelter}</h3>
            <p className="text-[10px] text-gray-500">
              {giftList.children.length} {t('children')}
            </p>
          </div>
        </div>
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${isExpanded ? 'rotate-180 bg-christmas-gold/20' : 'bg-gray-100'}`}
        >
          <ChevronDownIcon
            className={`h-4 w-4 ${isExpanded ? 'text-christmas-gold-dark' : 'text-gray-400'}`}
          />
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {giftList.children.map((child, childIdx) => (
              <div
                key={childIdx}
                className="flex items-center gap-2 rounded-lg border border-christmas-gold/10 bg-white/80 p-2 transition-colors hover:border-christmas-gold/30"
              >
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-christmas-berry to-rose-600">
                  <span className="text-[8px] font-bold text-white">{childIdx + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-gray-900">{child.name}</div>
                  <div className="flex items-center gap-0.5 truncate text-[10px] text-gray-500">
                    <GiftIcon className="h-2.5 w-2.5 flex-shrink-0 text-christmas-gold" />
                    <span className="truncate">{child.gift}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
