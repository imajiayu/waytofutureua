/**
 * Shared media file validation for client-side upload flows
 * (donation result files / market order proof files).
 */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

export const VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const

export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

interface ValidateOptions {
  /** MIME types accepted by the caller (intersection with IMAGE_TYPES + VIDEO_TYPES). */
  allowed: ReadonlyArray<string>
  /** Per-file max size in bytes. Defaults to MAX_MEDIA_FILE_SIZE. */
  maxSize?: number
  /** Build the error message for invalid-type failure. Receives the offending file names. */
  formatInvalidType: (names: string[]) => string
  /** Build the error message for oversize failure. */
  formatOversized: (names: string[]) => string
}

export type FileValidationResult = { ok: true } | { ok: false; error: string }

/**
 * Validate that all `files` are of a permitted MIME type and within size limit.
 * Returns the first failing batch as `{ ok: false, error }`; otherwise `{ ok: true }`.
 */
export function validateMediaFiles(files: File[], opts: ValidateOptions): FileValidationResult {
  const { allowed, maxSize = MAX_MEDIA_FILE_SIZE, formatInvalidType, formatOversized } = opts

  const invalid = files.filter((f) => !allowed.includes(f.type))
  if (invalid.length > 0) {
    return { ok: false, error: formatInvalidType(invalid.map((f) => f.name)) }
  }

  const oversized = files.filter((f) => f.size > maxSize)
  if (oversized.length > 0) {
    return { ok: false, error: formatOversized(oversized.map((f) => f.name)) }
  }

  return { ok: true }
}
