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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 sm:items-center sm:p-4">
      <div
        className={`rounded-t-xl bg-white sm:rounded-lg ${maxWidthClass} max-h-[95vh] w-full overflow-y-auto sm:max-h-[90vh]`}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pb-1 pt-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-body text-lg font-bold sm:text-xl">{title}</h2>
            <button
              onClick={onClose}
              className="-m-1 flex min-h-[44px] min-w-[44px] items-center justify-center p-1 text-2xl text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {error && <div className="mb-4 rounded bg-red-50 p-3 text-red-800">{error}</div>}

          {children}
        </div>
      </div>
    </div>
  )
}
