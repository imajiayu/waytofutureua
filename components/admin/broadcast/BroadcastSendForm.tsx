'use client'

import { SpinnerIcon } from '@/components/icons'
import type { AppLocale } from '@/types'

import type { Subscriber } from '../BroadcastModal'

const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  zh: 'Chinese',
  ua: 'Українська',
}

interface Template {
  name: string
  fileName: string
  projectId?: string
}

interface Props {
  templates: Template[]
  selectedTemplate: string
  setSelectedTemplate: (v: string) => void
  isLoadingTemplates: boolean
  previewLocale: AppLocale
  setPreviewLocale: (v: AppLocale) => void
  isLoadingPreview: boolean
  onPreview: () => void
  activeSubscribers: Subscriber[]
  selectedEmails: Set<string>
  isAllSelected: boolean
  isNoneSelected: boolean
  onSelectAll: () => void
  onDeselectAll: () => void
  onToggleEmail: (email: string) => void
  error: string | null
  isSending: boolean
  onClose: () => void
  onSend: () => void
}

export default function BroadcastSendForm({
  templates,
  selectedTemplate,
  setSelectedTemplate,
  isLoadingTemplates,
  previewLocale,
  setPreviewLocale,
  isLoadingPreview,
  onPreview,
  activeSubscribers,
  selectedEmails,
  isAllSelected,
  isNoneSelected,
  onSelectAll,
  onDeselectAll,
  onToggleEmail,
  error,
  isSending,
  onClose,
  onSend,
}: Props) {
  return (
    <>
      <div className="space-y-3">
        {/* Template Selector */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label className="mb-2 block text-sm font-medium text-blue-900">Template</label>
          {isLoadingTemplates ? (
            <div className="text-sm text-blue-700">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-blue-700">No templates available</div>
          ) : (
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              {templates.map((template) => (
                <option key={template.fileName} value={template.fileName}>
                  {template.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Preview Language Selector */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Preview Language</label>
          <div className="flex gap-2">
            {(Object.keys(LOCALE_LABELS) as AppLocale[]).map((locale) => (
              <button
                key={locale}
                onClick={() => setPreviewLocale(locale)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  previewLocale === locale
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {LOCALE_LABELS[locale]}
              </button>
            ))}
          </div>
          <button
            onClick={onPreview}
            disabled={isLoadingPreview || !selectedTemplate}
            className="mt-3 w-full rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isLoadingPreview ? (
              <span className="flex items-center justify-center gap-2">
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Preview Email'
            )}
          </button>
        </div>

        {/* Recipients Selector */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Recipients ({selectedEmails.size} of {activeSubscribers.length} selected)
            </label>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                disabled={isAllSelected}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={onDeselectAll}
                disabled={isNoneSelected}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Subscriber List */}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
            {activeSubscribers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No active subscribers</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activeSubscribers.map((subscriber) => (
                  <li key={subscriber.email}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(subscriber.email)}
                        onChange={() => onToggleEmail(subscriber.email)}
                        className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 truncate text-sm text-gray-900">
                        {subscriber.email}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {LOCALE_LABELS[subscriber.locale]}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={isSending}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSend}
          disabled={isSending || selectedEmails.size === 0 || !selectedTemplate}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isSending ? (
            <span className="flex items-center justify-center gap-2">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
              Sending...
            </span>
          ) : (
            `Send to ${selectedEmails.size} recipient${selectedEmails.size !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </>
  )
}
