import { describe, it, expect } from 'vitest'
import { toISODate, parseDate, formatDate } from './date'

describe('toISODate', () => {
  it('converts Date to YYYY-MM-DD string', () => {
    expect(toISODate(new Date('2026-04-10T12:00:00Z'))).toBe('2026-04-10')
  })

  it('pads single-digit months and days', () => {
    expect(toISODate(new Date('2026-01-05T00:00:00Z'))).toBe('2026-01-05')
  })
})

describe('parseDate', () => {
  it('passes through ISO 8601 dates unchanged', () => {
    expect(parseDate('2026-04-10')).toBe('2026-04-10')
  })

  it('parses US format MM/DD/YYYY', () => {
    expect(parseDate('04/10/2026', 'US')).toBe('2026-04-10')
  })

  it('parses EU format DD/MM/YYYY', () => {
    expect(parseDate('10/04/2026', 'EU')).toBe('2026-04-10')
  })

  it('parses dot-separated EU format DD.MM.YYYY', () => {
    expect(parseDate('10.04.2026', 'EU')).toBe('2026-04-10')
  })

  it('returns undefined for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(parseDate('')).toBeUndefined()
  })
})

describe('formatDate', () => {
  it('formats ISO date in en-US locale', () => {
    const result = formatDate('2026-04-10', 'en-US')
    expect(result).toMatch(/Apr(il)?\s+10,?\s+2026|4\/10\/2026/)
  })

  it('formats ISO date in de-DE locale', () => {
    const result = formatDate('2026-04-10', 'de-DE')
    // German format: 10.4.2026 or 10. April 2026
    expect(result).toContain('2026')
    expect(result).toContain('10')
  })
})
