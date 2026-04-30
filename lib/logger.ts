/**
 * Server-side Logger
 *
 * Unified logging for Server Components, Server Actions, API Routes, and utilities.
 * Outputs structured JSON in production, readable format in development.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('WEBHOOK', 'Payment received', { orderId: '123', status: 'paid' })
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogCategory =
  // Webhooks
  | 'WEBHOOK'
  | 'WEBHOOK:WAYFORPAY'
  | 'WEBHOOK:NOWPAYMENTS'
  | 'WEBHOOK:RESEND'
  // Payments
  | 'PAYMENT'
  | 'PAYMENT:WAYFORPAY'
  | 'PAYMENT:NOWPAYMENTS'
  // Core operations
  | 'DONATION'
  | 'ADMIN'
  | 'EMAIL'
  | 'SUBSCRIPTION'
  // Infrastructure
  | 'MEDIA'
  | 'MEDIA:CLOUDINARY'
  | 'STORAGE'
  | 'DB'
  // Flow
  | 'REDIRECT'
  | 'REFUND'
  | 'API'
  // Market module
  | 'MARKET:ADMIN'
  | 'MARKET:AUTH'
  | 'MARKET:EMAIL'
  | 'MARKET:ITEMS'
  | 'MARKET:ORDER'
  | 'MARKET:SALE'
  | 'MARKET:FILES'
  | 'WEBHOOK:WAYFORPAY-MARKET'

export interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  context?: LogContext
}

// Log level priority (higher = more important)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Get minimum log level from environment
function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined
  if (envLevel && envLevel in LOG_LEVEL_PRIORITY) {
    return envLevel
  }
  // Default: production = info, development = debug
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel()
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel]
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) return ''

  const parts: string[] = []
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue
    if (typeof value === 'object') {
      parts.push(`${key}=${JSON.stringify(value)}`)
    } else {
      parts.push(`${key}=${value}`)
    }
  }
  return parts.length > 0 ? ` | ${parts.join(' ')}` : ''
}

function log(level: LogLevel, category: LogCategory, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...(context && Object.keys(context).length > 0 && { context }),
  }

  // Production: JSON format for log aggregation tools
  if (process.env.NODE_ENV === 'production') {
    const output = JSON.stringify(entry)
    switch (level) {
      case 'error':
        console.error(output)
        break
      case 'warn':
        console.warn(output)
        break
      default:
        console.log(output)
    }
    return
  }

  // Development: Human-readable format
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

// Main logger object with level methods
export const logger = {
  debug: (category: LogCategory, message: string, context?: LogContext) =>
    log('debug', category, message, context),

  info: (category: LogCategory, message: string, context?: LogContext) =>
    log('info', category, message, context),

  warn: (category: LogCategory, message: string, context?: LogContext) =>
    log('warn', category, message, context),

  error: (category: LogCategory, message: string, context?: LogContext) =>
    log('error', category, message, context),

  // Convenience method for logging errors with stack trace
  errorWithStack: (
    category: LogCategory,
    message: string,
    error: unknown,
    context?: LogContext
  ) => {
    const errorContext: LogContext = { ...context }
    if (error instanceof Error) {
      errorContext.errorMessage = error.message
      errorContext.errorStack = error.stack
    } else {
      errorContext.error = String(error)
    }
    log('error', category, message, errorContext)
  },
}

export default logger
