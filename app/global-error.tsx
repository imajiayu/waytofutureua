'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Minimal error messages for global error boundary
const errorMessages = {
  en: {
    title: 'Something went wrong',
    description: "We're sorry, but something unexpected happened. Our team has been notified.",
    button: 'Try again',
  },
  zh: {
    title: '发生了错误',
    description: '很抱歉，发生了意外错误。我们的团队已收到通知。',
    button: '重试',
  },
  ua: {
    title: 'Щось пішло не так',
    description: 'Вибачте, але сталася неочікувана помилка. Нашу команду повідомлено.',
    button: 'Спробувати знову',
  },
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
  }, [error])

  // Try to detect locale from browser, fallback to 'en'
  const browserLang = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en'
  const locale = browserLang in errorMessages ? browserLang : 'en'
  const messages = errorMessages[locale as keyof typeof errorMessages]

  return (
    <html lang={locale}>
      <body>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              textAlign: 'center',
              backgroundColor: 'white',
              padding: '40px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h1
              style={{
                fontSize: '2rem',
                marginBottom: '1rem',
                color: '#111827',
                fontWeight: '600',
              }}
            >
              {messages.title}
            </h1>
            <p
              style={{
                marginBottom: '2rem',
                color: '#6b7280',
                lineHeight: '1.6',
              }}
            >
              {messages.description}
            </p>
            <button
              onClick={reset}
              style={{
                padding: '12px 32px',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#374151'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#000'
              }}
            >
              {messages.button}
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
