/**
 * Date range helpers for reports — all return ISO 8601 YYYY-MM-DD format.
 */

export interface DateRange {
  from: string
  to: string
}

/**
 * Last N days including today (using local date).
 */
export function lastNDays(days: number, now: Date): DateRange {
  const to = toIsoDate(now)

  // Subtract days using date manipulation instead of milliseconds
  const fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1))
  const from = toIsoDate(fromDate)

  return { from, to }
}

/**
 * First to last day of the current month (local time).
 */
export function thisMonth(now: Date): DateRange {
  const year = now.getFullYear()
  const month = now.getMonth()

  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const to = toIsoDate(new Date(year, month + 1, 0)) // Last day of month

  return { from, to }
}

/**
 * First to last day of the previous month.
 */
export function lastMonth(now: Date): DateRange {
  const year = now.getFullYear()
  const month = now.getMonth()

  // Get previous month
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  const from = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`
  const to = toIsoDate(new Date(prevYear, prevMonth + 1, 0)) // Last day of prev month

  return { from, to }
}

/**
 * Jan 1 to Dec 31 of the current year.
 */
export function thisYear(now: Date): DateRange {
  const year = now.getFullYear()
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  }
}

/**
 * Jan 1 to Dec 31 of the previous year.
 */
export function lastYear(now: Date): DateRange {
  const year = now.getFullYear() - 1
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  }
}

/**
 * Convert a Date to ISO 8601 YYYY-MM-DD format (local date, not UTC).
 */
function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
