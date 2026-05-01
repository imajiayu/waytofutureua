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
import { clientLogger } from '@/lib/logger-client'
import type { AppLocale } from '@/types'

import BroadcastPreviewView from './broadcast/BroadcastPreviewView'
import BroadcastResultView from './broadcast/BroadcastResultView'
import BroadcastSendForm from './broadcast/BroadcastSendForm'

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
  const [previewLocale, setPreviewLocale] = useState<AppLocale>('en')
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua'
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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://waytofutureua.org.ua'
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
            <BroadcastPreviewView
              previewSubject={previewSubject}
              previewHtml={previewHtml}
              previewLocale={previewLocale}
              onBack={handleBackFromPreview}
            />
          ) : result ? (
            <BroadcastResultView result={result} onClose={handleClose} />
          ) : (
            <BroadcastSendForm
              templates={templates}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              isLoadingTemplates={isLoadingTemplates}
              previewLocale={previewLocale}
              setPreviewLocale={setPreviewLocale}
              isLoadingPreview={isLoadingPreview}
              onPreview={handlePreview}
              activeSubscribers={activeSubscribers}
              selectedEmails={selectedEmails}
              isAllSelected={isAllSelected}
              isNoneSelected={isNoneSelected}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onToggleEmail={handleToggleEmail}
              error={error}
              isSending={isSending}
              onClose={handleClose}
              onSend={handleSend}
            />
          )}
        </div>
      </div>
    </div>
  )
}
