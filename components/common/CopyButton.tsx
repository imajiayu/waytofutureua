'use client'

import { useState } from 'react'

import { clientLogger } from '@/lib/logger-client'

type CopyButtonProps = {
  text: string
  label: string
  copiedLabel: string
  variant?: 'primary' | 'secondary'
  className?: string
}

export default function CopyButton({
  text,
  label,
  copiedLabel,
  variant = 'secondary',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      clientLogger.error('CLIPBOARD', 'Failed to copy', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const baseStyles =
    'inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 transform active:scale-95 whitespace-nowrap'

  const variantStyles =
    variant === 'primary'
      ? 'bg-ukraine-blue-500 text-white shadow-lg hover:shadow-xl hover:bg-ukraine-blue-600'
      : 'bg-white/90 backdrop-blur-sm text-gray-700 shadow-md hover:shadow-lg border border-gray-200 hover:border-ukraine-blue-300 hover:bg-ukraine-blue-50'

  return (
    <button
      onClick={handleCopy}
      className={`${baseStyles} ${variantStyles} ${className}`}
      type="button"
    >
      {copied ? (
        <>
          <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          {copiedLabel}
        </>
      ) : (
        <>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}
