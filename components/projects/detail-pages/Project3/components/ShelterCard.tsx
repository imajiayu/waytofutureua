'use client'

import { HeartIcon, MapPinIcon } from '@/components/icons'

import type { Shelter } from '../types'

interface ShelterCardProps {
  shelter: Shelter
  index: number
}

export default function ShelterCard({ shelter, index }: ShelterCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-christmas-pine/10 bg-white shadow-sm transition-all duration-300 hover:border-christmas-gold/30 hover:shadow-md">
      <div className="h-1 bg-gradient-to-r from-christmas-berry via-christmas-gold to-christmas-pine" />
      <div className="p-3">
        <div className="mb-2 flex items-start gap-2">
          <div className="relative flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-christmas-berry to-rose-600 shadow-sm transition-transform group-hover:scale-105">
              <HeartIcon className="h-4 w-4 text-white" />
            </div>
            <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-christmas-gold">
              <span className="text-[8px] font-bold text-white">{index + 1}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-sm font-bold leading-tight text-gray-900">
              {shelter.name}
            </h3>
            <p className="truncate text-[10px] italic text-gray-400">{shelter.nameOriginal}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex min-w-0 flex-1 items-center gap-1 truncate text-gray-500">
            <MapPinIcon className="h-3 w-3 flex-shrink-0 text-christmas-pine" />
            <span className="truncate">{shelter.address}</span>
          </div>
          <div className="ml-2 flex-shrink-0 rounded-full bg-christmas-gold/20 px-2 py-0.5 font-bold text-christmas-gold-dark">
            {shelter.childrenCount}
          </div>
        </div>
      </div>
    </div>
  )
}
