export type DateHint = 'ISO' | 'US' | 'EU'

/**
 * Convert a Date object to an ISO 8601 date-only string (YYYY-MM-DD).
 * Uses UTC to avoid timezone-induced day shifts.
 */
export function toISODate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const ISO_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/
const SLASH_REGEX = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const DOT_REGEX = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/

/**
 * Parse a date string to ISO 8601 YYYY-MM-DD.
 * @param input - date string in ISO, US (MM/DD/YYYY), or EU (DD/MM/YYYY or DD.MM.YYYY) format
 * @param hint - helps resolve ambiguous slash formats (US vs EU); defaults to ISO detection
 */
export function parseDate(input: string, hint?: DateHint): string | undefined {
  if (!input) return undefined

  // ISO YYYY-MM-DD
  const iso = ISO_REGEX.exec(input)
  if (iso) {
    const [, y, m, d] = iso
    if (isValidDate(Number(y), Number(m), Number(d))) return `${y}-${m}-${d}`
    return undefined
  }

  // Slash-separated: MM/DD/YYYY (US) or DD/MM/YYYY (EU)
  const slash = SLASH_REGEX.exec(input)
  if (slash) {
    const [, a, b, y] = slash
    const [month, day] = hint === 'EU' ? [Number(b), Number(a)] : [Number(a), Number(b)]
    if (!isValidDate(Number(y), month, day)) return undefined
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Dot-separated: DD.MM.YYYY (EU)
  const dot = DOT_REGEX.exec(input)
  if (dot) {
    const [, d = '', m = '', y = ''] = dot
    if (!isValidDate(Number(y), Number(m), Number(d))) return undefined
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return undefined
}

/**
 * Format an ISO 8601 date string for display using Intl.DateTimeFormat.
 */
export function formatDate(isoDate: string, locale: string): string {
  const parts = isoDate.split('-').map(Number)
  const [y = 2000, m = 1, d = 1] = parts
  const date = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  )
}
