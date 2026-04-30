'use client'

/**
 * Client-side Logger
 *
 * Unified logging for Client Components ('use client').
 * Production: Only errors are logged to avoid console noise.
 * Development: All levels are logged.
 *
 * Usage:
 *   import { clientLogger } from '@/lib/logger-client'
 *   clientLogger.error('WIDGET', 'Payment widget failed', { reason: 'timeout' })
 */

export type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error'

export type ClientLogCategory =
  | 'WIDGET'
  | 'WIDGET:WAYFORPAY'
  | 'WIDGET:NOWPAYMENTS'
  | 'WIDGET:MARKET'
  | 'FORM'
  | 'FORM:DONATION'
  | 'UI'
  | 'API'
  | 'DOWNLOAD'
  | 'CLIPBOARD'

export interface ClientLogContext {
  [key: string]: unknown
}

// Log level priority
const LOG_LEVEL_PRIORITY: Record<ClientLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function shouldLog(level: ClientLogLevel): boolean {
  // Production: only error and warn
  if (isProduction()) {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY['warn']
  }
  // Development: all levels
  return true
}

function formatContext(context?: ClientLogContext): string {
  if (!context || Object.keys(context).length === 0) return ''

  const parts: string[] = []
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue
    if (typeof value === 'object') {
      try {
        parts.push(`${key}=${JSON.stringify(value)}`)
      } catch {
        parts.push(`${key}=[Object]`)
      }
    } else {
      parts.push(`${key}=${value}`)
    }
  }
  return parts.length > 0 ? ` | ${parts.join(' ')}` : ''
}

function log(
  level: ClientLogLevel,
  category: ClientLogCategory,
  message: string,
  context?: ClientLogContext
): void {
  if (!shouldLog(level)) return

  const prefix = `[${category}]`
  const contextStr = formatContext(context)
  const logMessage = `${prefix} ${message}${contextStr}`

  switch (level) {
    case 'error':
      console.error(logMessage)
      break
    case 'warn':
      console.warn(logMessage)
      break
    case 'debug':
      console.debug(logMessage)
      break
    default:
      console.log(logMessage)
  }
}

export const clientLogger = {
  debug: (category: ClientLogCategory, message: string, context?: ClientLogContext) =>
    log('debug', category, message, context),

  info: (category: ClientLogCategory, message: string, context?: ClientLogContext) =>
    log('info', category, message, context),

  warn: (category: ClientLogCategory, message: string, context?: ClientLogContext) =>
    log('warn', category, message, context),

  error: (category: ClientLogCategory, message: string, context?: ClientLogContext) =>
    log('error', category, message, context),

  // Convenience method for logging errors with details
  errorWithDetails: (
    category: ClientLogCategory,
    message: string,
    error: unknown,
    context?: ClientLogContext
  ) => {
    const errorContext: ClientLogContext = { ...context }
    if (error instanceof Error) {
      errorContext.errorMessage = error.message
    } else {
      errorContext.error = String(error)
    }
    log('error', category, message, errorContext)
  },
}

export default clientLogger
