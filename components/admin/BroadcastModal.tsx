/**
 * Broadcast Email Modal Component
 * Modal for sending newsletter broadcasts to selected subscribers with preview support
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { clientLogger } from '@/lib/logger-client'
import {
  sendEmailBroadcast,
  getAvailableBroadcastTemplates,
  previewEmailTemplate,
  BroadcastRecipient
} from '@/app/actions/email-broadcast'
import type { DonationLocale } from '@/types'
import { SpinnerIcon } from '@/components/icons'

export interface Subscriber {
  email: string
  locale: DonationLocale
  is_subscribed: boolean
}

interface BroadcastModalProps {
  isOpen: boolean
  onClose: () => void
  subscribers: Subscriber[]
  /** Fired when a broadcast finishes (success or partial failure), regardless of exact counts */
  onSent?: () => void
}

type PreviewLocale = DonationLocale

const LOCALE_LABELS: Record<PreviewLocale, string> = {
  en: 'English',
  zh: 'Chinese',
  ua: 'Українська'
}

export default function BroadcastModal({
  isOpen,
  onClose,
  subscribers,
  onSent
}: BroadcastModalProps) {
  // Filter to only active subscribers
  const activeSubscribers = useMemo(
    () => subscribers.filter((s) => s.is_subscribed),
    [subscribers]
  )

  // State
  const [templates, setTemplates] = useState<Array<{ name: string; fileName: string; projectId?: string }>>([])
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
            setSelectedTemplate(prev => prev || response.data![0].fileName)
          }
        }
      } catch (err) {
        if (!cancelled) {
          clientLogger.error('API', 'Failed to load email templates', { error: err instanceof Error ? err.message : String(err) })
        }
      } finally {
        if (!cancelled) setIsLoadingTemplates(false)
      }
    }
    load()
    return () => { cancelled = true }
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
        unsubscribe_url: `${baseUrl}/api/unsubscribe?token=PREVIEW_TOKEN`
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
        recipients
        // project_url is automatically built from template.projectId in broadcast.ts
      })

      if (response.error) {
        setError(response.error)
      } else if (response.data) {
        setResult({
          success: response.data.success,
          sent: response.data.sent,
          failed: response.data.failed
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
      <div className="flex min-h-screen items-end sm:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div
          className={`relative bg-white rounded-t-xl sm:rounded-lg shadow-xl ${showPreview ? 'max-w-4xl' : 'max-w-lg'} w-full p-4 sm:p-6 space-y-4 transition-all duration-300 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 font-body">
              {showPreview ? 'Email Preview' : 'Send Newsletter Broadcast'}
            </h2>
            <button
              onClick={handleClose}
              disabled={isSending}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 p-1 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-500">Subject: </span>
                <span className="font-medium text-gray-900">{previewSubject}</span>
              </div>

              {/* Email Preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <span className="text-xs text-gray-500 ml-2">
                    Preview ({LOCALE_LABELS[previewLocale]})
                  </span>
                </div>
                <iframe
                  srcDoc={previewHtml || ''}
                  className="w-full h-[300px] sm:h-[500px] bg-white"
                  title="Email Preview"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleBackFromPreview}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          ) : result ? (
            // Success/Result View
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}
              >
                <div className="flex items-start gap-3">
                  <svg
                    className={`w-6 h-6 flex-shrink-0 ${result.success ? 'text-green-600' : 'text-yellow-600'}`}
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
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            // Send Form
            <>
              <div className="space-y-3">
                {/* Template Selector */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Template
                  </label>
                  {isLoadingTemplates ? (
                    <div className="text-sm text-blue-700">Loading templates...</div>
                  ) : templates.length === 0 ? (
                    <div className="text-sm text-blue-700">No templates available</div>
                  ) : (
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview Language
                  </label>
                  <div className="flex gap-2">
                    {(Object.keys(LOCALE_LABELS) as PreviewLocale[]).map((locale) => (
                      <button
                        key={locale}
                        onClick={() => setPreviewLocale(locale)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                          previewLocale === locale
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {LOCALE_LABELS[locale]}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePreview}
                    disabled={isLoadingPreview || !selectedTemplate}
                    className="mt-3 w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {isLoadingPreview ? (
                      <span className="flex items-center justify-center gap-2">
                        <SpinnerIcon className="animate-spin h-4 w-4" />
                        Loading...
                      </span>
                    ) : (
                      'Preview Email'
                    )}
                  </button>
                </div>

                {/* Recipients Selector */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Recipients ({selectedEmails.size} of {activeSubscribers.length} selected)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        disabled={isAllSelected}
                        className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        disabled={isNoneSelected}
                        className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Subscriber List */}
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                    {activeSubscribers.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No active subscribers
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {activeSubscribers.map((subscriber) => (
                          <li key={subscriber.email}>
                            <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedEmails.has(subscriber.email)}
                                onChange={() => handleToggleEmail(subscriber.email)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="flex-1 text-sm text-gray-900 truncate">
                                {subscriber.email}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
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
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSending}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending || selectedEmails.size === 0 || !selectedTemplate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <SpinnerIcon className="animate-spin h-4 w-4" />
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
