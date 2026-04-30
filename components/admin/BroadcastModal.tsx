/**
 * Broadcast Email Modal Component
 * Modal for sending newsletter broadcasts to selected subscribers with preview support
 */

'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  BroadcastRecipient,
  getAvailableBroadcastTemplates,
  previewEmailTemplate,
  sendEmailBroadcast,
} from '@/app/actions/email-broadcast'
import { SpinnerIcon } from '@/components/icons'
import { clientLogger } from '@/lib/logger-client'
import type { AppLocale } from '@/types'

export interface Subscriber {
  email: string
  locale: AppLocale
  is_subscribed: boolean
}

interface BroadcastModalProps {
  isOpen: boolean
  onClose: () => void
  subscribers: Subscriber[]
  /** Fired when a broadcast finishes (success or partial failure), regardless of exact counts */
  onSent?: () => void
}

type PreviewLocale = AppLocale

const LOCALE_LABELS: Record<PreviewLocale, string> = {
  en: 'English',
  zh: 'Chinese',
  ua: 'Українська',
}

export default function BroadcastModal({
  isOpen,
  onClose,
  subscribers,
  onSent,
}: BroadcastModalProps) {
  // Filter to only active subscribers
  const activeSubscribers = useMemo(() => subscribers.filter((s) => s.is_subscribed), [subscribers])

  // State
  const [templates, setTemplates] = useState<
    Array<{ name: string; fileName: string; projectId?: string }>
  >([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [previewLocale, setPreviewLocale] = useState<PreviewLocale>('en')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState<string | null>(null)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    sent: number
    failed: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Selected recipients (emails)
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())

  // Initialize with all subscribers selected when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedEmails(new Set(activeSubscribers.map((s) => s.email)))
    }
  }, [isOpen, activeSubscribers])

  // Load available templates on mount
  useEffect(() => {
    if (!isOpen || templates.length > 0) return
    let cancelled = false
    const load = async () => {
      setIsLoadingTemplates(true)
      try {
        const response = await getAvailableBroadcastTemplates()
        if (cancelled) return
        if (response.data) {
          setTemplates(response.data)
          if (response.data.length > 0) {
            setSelectedTemplate((prev) => prev || response.data![0].fileName)
          }
        }
      } catch (err) {
        if (!cancelled) {
          clientLogger.error('API', 'Failed to load email templates', {
            error: err instanceof Error ? err.message : String(err),
          })
        }
      } finally {
        if (!cancelled) setIsLoadingTemplates(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [isOpen, templates.length])

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedEmails(new Set(activeSubscribers.map((s) => s.email)))
  }

  const handleDeselectAll = () => {
    setSelectedEmails(new Set())
  }

  const handleToggleEmail = (email: string) => {
    const newSelected = new Set(selectedEmails)
    if (newSelected.has(email)) {
      newSelected.delete(email)
    } else {
      newSelected.add(email)
    }
    setSelectedEmails(newSelected)
  }

  const isAllSelected = selectedEmails.size === activeSubscribers.length
  const isNoneSelected = selectedEmails.size === 0

  // Get selected recipients with locale info
  const getSelectedRecipients = (): BroadcastRecipient[] => {
    return activeSubscribers
      .filter((s) => selectedEmails.has(s.email))
      .map((s) => ({ email: s.email, locale: s.locale }))
  }

  // Get current template's projectId
  const getProjectId = (): string | undefined => {
    const template = templates.find((t) => t.fileName === selectedTemplate)
    return template?.projectId
  }

  // Build project URL based on template's projectId
  const buildProjectUrl = (locale: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const projectId = getProjectId()
    if (projectId) {
      return `${baseUrl}/${locale}/donate?project=${projectId}`
    }
    return `${baseUrl}/${locale}/donate`
  }

  const handlePreview = async () => {
    setIsLoadingPreview(true)
    setError(null)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const response = await previewEmailTemplate(selectedTemplate, previewLocale, {
        project_url: buildProjectUrl(previewLocale),
        unsubscribe_url: `${baseUrl}/api/unsubscribe?token=PREVIEW_TOKEN`,
      })

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setPreviewHtml(response.data.html)
        setPreviewSubject(response.data.subject)
        setShowPreview(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleSend = async () => {
    const recipients = getSelectedRecipients()
    if (recipients.length === 0) {
      setError('Please select at least one recipient')
      return
    }

    setIsSending(true)
    setError(null)
    setResult(null)

    try {
      const response = await sendEmailBroadcast({
        templateName: selectedTemplate,
        recipients,
        // project_url is automatically built from template.projectId in broadcast.ts
      })

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setResult({
          success: response.data.success,
          sent: response.data.sent,
          failed: response.data.failed,
        })
        if (response.data.sent > 0 || response.data.failed > 0) {
          onSent?.()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send broadcast')
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) {
      setResult(null)
      setError(null)
      setShowPreview(false)
      setPreviewHtml(null)
      setPreviewSubject(null)
      onClose()
    }
  }

  const handleBackFromPreview = () => {
    setShowPreview(false)
    setPreviewHtml(null)
    setPreviewSubject(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center sm:items-center sm:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div
          className={`relative rounded-t-xl bg-white shadow-xl sm:rounded-lg ${showPreview ? 'max-w-4xl' : 'max-w-lg'} max-h-[95vh] w-full space-y-4 overflow-y-auto p-4 transition-all duration-300 sm:max-h-[90vh] sm:p-6`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-body text-lg font-bold text-gray-900 sm:text-xl">
              {showPreview ? 'Email Preview' : 'Send Newsletter Broadcast'}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSending}
              className="-m-1 flex min-h-[44px] min-w-[44px] items-center justify-center p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          {showPreview ? (
            // Preview View
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
                    Preview ({LOCALE_LABELS[previewLocale]})
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
                  onClick={handleBackFromPreview}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Back
                </button>
              </div>
            </div>
          ) : result ? (
            // Success/Result View
            <div className="space-y-4">
              <div
                className={`rounded-lg p-4 ${result.success ? 'border border-green-200 bg-green-50' : 'border border-yellow-200 bg-yellow-50'}`}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className={`h-6 w-6 flex-shrink-0 ${result.success ? 'text-green-600' : 'text-yellow-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <h3
                      className={`font-medium ${result.success ? 'text-green-900' : 'text-yellow-900'}`}
                    >
                      {result.success
                        ? 'Broadcast Sent Successfully!'
                        : 'Broadcast Completed with Errors'}
                    </h3>
                    <div className="mt-2 text-sm text-gray-700">
                      <p>Successfully sent: {result.sent}</p>
                      {result.failed > 0 && <p>Failed: {result.failed}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          ) : (
            // Send Form
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
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Preview Language
                  </label>
                  <div className="flex gap-2">
                    {(Object.keys(LOCALE_LABELS) as PreviewLocale[]).map((locale) => (
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
                    onClick={handlePreview}
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
                        onClick={handleSelectAll}
                        disabled={isAllSelected}
                        className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleDeselectAll}
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
                      <div className="p-4 text-center text-sm text-gray-500">
                        No active subscribers
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {activeSubscribers.map((subscriber) => (
                          <li key={subscriber.email}>
                            <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={selectedEmails.has(subscriber.email)}
                                onChange={() => handleToggleEmail(subscriber.email)}
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
                  onClick={handleClose}
                  disabled={isSending}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
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
          )}
        </div>
      </div>
    </div>
  )
}
