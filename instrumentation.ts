// This file is used to configure Sentry on the server side and edge runtime.
// It will be automatically called by Next.js when the server starts.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import type { ErrorEvent } from '@sentry/nextjs'

function scrubSentryEvent(event: ErrorEvent) {
  if (event.message) {
    event.message = event.message.replace(/\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[EMAIL]')
  }

  if (event.request?.data) {
    const data = event.request.data
    if (typeof data === 'object' && data !== null) {
      const redactedData = { ...data } as Record<string, any>
      const sensitiveFields = ['email', 'password', 'token', 'secret', 'apiKey', 'merchantAccount']
      for (const field of sensitiveFields) {
        if (field in redactedData) {
          redactedData[field] = '[REDACTED]'
        }
      }
      event.request.data = redactedData
    }
  }

  return event
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === 'production',

      tracesSampleRate: 1,

      // Attach local variable values to stack frames for better debugging
      includeLocalVariables: true,

      enableLogs: true,

      debug: false,

      beforeSend: scrubSentryEvent,
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    const Sentry = await import('@sentry/nextjs')

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      enabled: process.env.NODE_ENV === 'production',

      tracesSampleRate: 1,
      enableLogs: true,
      debug: false,
      beforeSend: scrubSentryEvent,
    })
  }
}

// Automatically captures all unhandled server-side request errors
export async function onRequestError(
  ...args: Parameters<(typeof import('@sentry/nextjs'))['captureRequestError']>
) {
  const { captureRequestError } = await import('@sentry/nextjs')
  captureRequestError(...args)
}
