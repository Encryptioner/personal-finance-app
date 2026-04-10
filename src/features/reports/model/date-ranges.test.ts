import { describe, it, expect } from 'vitest'
import { lastNDays, thisMonth, lastMonth, thisYear, lastYear } from './date-ranges'

describe('DateRanges', () => {
  // Use a fixed "now" for consistent tests
  const now = new Date('2026-04-15T14:30:00Z')

  describe('lastNDays', () => {
    it('returns last N days including today', () => {
      const result = lastNDays(7, now)

      expect(result.from).toBe('2026-04-09')
      expect(result.to).toBe('2026-04-15')
    })

    it('handles N=1 (today only)', () => {
      const result = lastNDays(1, now)

      expect(result.from).toBe('2026-04-15')
      expect(result.to).toBe('2026-04-15')
    })

    it('handles N=30 (last 30 days)', () => {
      const result = lastNDays(30, now)

      expect(result.from).toBe('2026-03-17')
      expect(result.to).toBe('2026-04-15')
    })

    it('handles month boundaries correctly', () => {
      const date = new Date('2026-04-05T10:00:00Z')
      const result = lastNDays(10, date)

      // 10 days including April 5: Apr 5,4,3,2,1 + Mar 31,30,29,28,27
      expect(result.from).toBe('2026-03-27')
      expect(result.to).toBe('2026-04-05')
    })
  })

  describe('thisMonth', () => {
    it('returns first to last day of current month', () => {
      const result = thisMonth(now)

      expect(result.from).toBe('2026-04-01')
      expect(result.to).toBe('2026-04-30')
    })

    it('handles months with 31 days', () => {
      const date = new Date('2026-05-15T10:00:00Z')
      const result = thisMonth(date)

      expect(result.from).toBe('2026-05-01')
      expect(result.to).toBe('2026-05-31')
    })

    it('handles February in non-leap year', () => {
      const date = new Date('2027-02-15T10:00:00Z')
      const result = thisMonth(date)

      expect(result.from).toBe('2027-02-01')
      expect(result.to).toBe('2027-02-28')
    })

    it('handles February in leap year', () => {
      const date = new Date('2028-02-15T10:00:00Z')
      const result = thisMonth(date)

      expect(result.from).toBe('2028-02-01')
      expect(result.to).toBe('2028-02-29')
    })
  })

  describe('lastMonth', () => {
    it('returns entire previous month', () => {
      const result = lastMonth(now)

      expect(result.from).toBe('2026-03-01')
      expect(result.to).toBe('2026-03-31')
    })

    it('wraps around year boundary', () => {
      const date = new Date('2026-01-15T10:00:00Z')
      const result = lastMonth(date)

      expect(result.from).toBe('2025-12-01')
      expect(result.to).toBe('2025-12-31')
    })

    it('handles month transitions correctly', () => {
      const date = new Date('2026-05-01T10:00:00Z')
      const result = lastMonth(date)

      expect(result.from).toBe('2026-04-01')
      expect(result.to).toBe('2026-04-30')
    })
  })

  describe('thisYear', () => {
    it('returns Jan 1 to Dec 31 of current year', () => {
      const result = thisYear(now)

      expect(result.from).toBe('2026-01-01')
      expect(result.to).toBe('2026-12-31')
    })

    it('handles any date in the year', () => {
      const date = new Date('2026-12-25T10:00:00Z')
      const result = thisYear(date)

      expect(result.from).toBe('2026-01-01')
      expect(result.to).toBe('2026-12-31')
    })
  })

  describe('lastYear', () => {
    it('returns Jan 1 to Dec 31 of previous year', () => {
      const result = lastYear(now)

      expect(result.from).toBe('2025-01-01')
      expect(result.to).toBe('2025-12-31')
    })

    it('handles year boundary correctly', () => {
      const date = new Date('2026-01-01T10:00:00Z')
      const result = lastYear(date)

      expect(result.from).toBe('2025-01-01')
      expect(result.to).toBe('2025-12-31')
    })
  })

  // ─── Format consistency ─────────────────────────────────────────

  it('all helpers return YYYY-MM-DD format', () => {
    const helpers = [
      () => lastNDays(7, now),
      () => thisMonth(now),
      () => lastMonth(now),
      () => thisYear(now),
      () => lastYear(now),
    ]

    for (const helper of helpers) {
      const result = helper()
      expect(result.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.from <= result.to).toBe(true)
    }
  })
})
