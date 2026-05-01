/**
 * Format a remaining-seconds countdown as `HH:MM:SS`.
 * Returns `00:00:00` when the input is non-positive.
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
