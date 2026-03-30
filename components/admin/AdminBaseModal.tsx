'use client'

import { ReactNode } from 'react'
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock'

interface AdminBaseModalProps {
  title: string
  onClose: () => void
  error?: string
  maxWidth?: '3xl' | '4xl'
  children: ReactNode
}

export default function AdminBaseModal({
  title,
  onClose,
  error,
  maxWidth = '4xl',
  children,
}: AdminBaseModalProps) {
  useBodyScrollLock()

  const maxWidthClass = maxWidth === '3xl' ? 'max-w-3xl' : 'max-w-4xl'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className={`bg-white sm:rounded-lg rounded-t-xl ${maxWidthClass} w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}>
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold font-body">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl p-1 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded">
              {error}
            </div>
          )}

          {children}
        </div>
      </div>
    </div>
  )
}
