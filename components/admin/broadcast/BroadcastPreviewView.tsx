'use client'

import { LOCALE_DISPLAY_NAMES } from '@/lib/i18n-utils'
import type { AppLocale } from '@/types'

interface Props {
  previewSubject: string | null
  previewHtml: string | null
  previewLocale: AppLocale
  onBack: () => void
}

export default function BroadcastPreviewView({
  previewSubject,
  previewHtml,
  previewLocale,
  onBack,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Subject Line */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <span className="text-sm text-gray-500">Subject: </span>
        <span className="font-medium text-gray-900">{previewSubject}</span>
      </div>

      {/* Email Preview */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400"></div>
            <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
            <div className="h-3 w-3 rounded-full bg-green-400"></div>
          </div>
          <span className="ml-2 text-xs text-gray-500">
            Preview ({LOCALE_DISPLAY_NAMES[previewLocale]})
          </span>
        </div>
        <iframe
          srcDoc={previewHtml || ''}
          className="h-[300px] w-full bg-white sm:h-[500px]"
          title="Email Preview"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back
        </button>
      </div>
    </div>
  )
}
