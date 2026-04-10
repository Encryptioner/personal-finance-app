export type DateFormat = 'iso' | 'us' | 'eu' | 'ambiguous'

/**
 * Heuristic date format detector.
 * Examines a sample of date strings and determines the most likely format.
 *
 * ISO: YYYY-MM-DD (uses dashes, year-first)
 * US:  MM/DD/YYYY (uses slashes, month-first)
 * EU:  DD/MM/YYYY or DD.MM.YYYY (uses slashes/dots, day-first)
 */
export function detectDateFormat(dates: string[]): DateFormat {
  if (dates.length === 0) return 'ambiguous'

  const votes = { iso: 0, us: 0, eu: 0, ambiguous: 0, unknown: 0 }

  for (const date of dates) {
    const fmt = classifyDate(date.trim())
    votes[fmt]++
  }

  // All ISO → iso
  if (votes.iso === dates.length) return 'iso'

  // Only definitive EU votes (no US, no ISO) — ambiguous votes don't block this
  if (votes.eu > 0 && votes.us === 0 && votes.iso === 0) return 'eu'

  // Only definitive US votes (no EU, no ISO) — ambiguous votes don't block this
  if (votes.us > 0 && votes.eu === 0 && votes.iso === 0) return 'us'

  return 'ambiguous'
}

function classifyDate(date: string): 'iso' | 'us' | 'eu' | 'ambiguous' | 'unknown' {
  // ISO: YYYY-MM-DD (4-digit year first, dashes)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'iso'

  // Slash-separated: MM/DD/YYYY or DD/MM/YYYY
  const slashMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, a, b] = slashMatch
    const first = parseInt(a!, 10)
    const second = parseInt(b!, 10)

    // If first number > 12 → must be day (EU)
    if (first > 12) return 'eu'
    // If second number > 12 → must be day, so first is month (US)
    if (second > 12) return 'us'
    // Both ≤ 12 → genuinely ambiguous
    return 'ambiguous'
  }

  // Dot-separated: DD.MM.YYYY (EU convention)
  const dotMatch = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const [, a] = dotMatch
    const first = parseInt(a!, 10)
    if (first > 12) return 'eu'
    // Dot-separated dates are conventionally EU, but ambiguous if first ≤ 12
    return 'eu'
  }

  // Dash-separated but year-last: DD-MM-YYYY (EU)
  const dashMatch = date.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (dashMatch) {
    const [, a] = dashMatch
    const first = parseInt(a!, 10)
    if (first > 12) return 'eu'
    // Ambiguous with ISO if 2-digit year segments, but year-last is EU
    return 'eu'
  }

  return 'unknown'
}
