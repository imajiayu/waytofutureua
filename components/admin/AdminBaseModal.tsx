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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg ${maxWidthClass} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold font-body">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
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
