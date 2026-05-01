/**
 * Clamp a raw input string to [min, max], round to 1 decimal, fall back when out of range.
 * Extracted verbatim from DonationFormCard so the validation behavior stays identical.
 */
export function clampAmount(
  raw: string,
  min: number,
  max: number,
  fallback: number
): { value: number; wasInvalid: boolean } {
  const num = parseFloat(raw)
  const outOfRange = isNaN(num) || num < min || num > max
  const value = isNaN(num) || num < min ? fallback : num > max ? max : Math.round(num * 10) / 10
  return { value, wasInvalid: outOfRange }
}
