import { type FormEvent, useState } from 'react'

interface UseAsyncFormOptions {
  /** Fallback message used when the thrown error is not an `Error` instance. */
  fallbackError?: string
}

interface UseAsyncFormReturn {
  loading: boolean
  error: string
  setError: (message: string) => void
  onSubmit: (e?: FormEvent) => Promise<void>
}

/**
 * Shared loading + error scaffolding for admin modal form submissions.
 *
 * Wraps the recurring `try/catch + setLoading/setError` pattern used across
 * project / market-item / batch-donation modals.
 */
export function useAsyncForm(
  submit: () => Promise<void>,
  options?: UseAsyncFormOptions
): UseAsyncFormReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    try {
      await submit()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (options?.fallbackError ?? 'Operation failed'))
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, onSubmit, setError }
}
