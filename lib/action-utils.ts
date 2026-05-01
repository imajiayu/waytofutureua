import { type LogCategory, logger } from '@/lib/logger'

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Wrap a server-action body that has no business-level error branches:
 * any thrown error is logged and converted into the generic
 * `{ success: false; error: 'Internal error' }` response.
 *
 * Do NOT use this in actions that need specific error codes (e.g.
 * `'invalid_email'`, `'rate_limited'`) — keep their `try/catch` inline so the
 * client can still discriminate on the code.
 */
export async function tryAction<T>(
  category: LogCategory,
  op: string,
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await fn() }
  } catch (err) {
    logger.error(category, `${op} failed`, {
      error: err instanceof Error ? err.message : String(err),
    })
    return { success: false, error: 'Internal error' }
  }
}
