import { describe, it, expect } from 'vitest'
import { getDecimalPlaces, formatCurrency, parseMoney } from './money'

describe('getDecimalPlaces', () => {
  it('returns 2 for USD (default)', () => expect(getDecimalPlaces('USD')).toBe(2))
  it('returns 2 for EUR', () => expect(getDecimalPlaces('EUR')).toBe(2))
  it('returns 2 for BDT', () => expect(getDecimalPlaces('BDT')).toBe(2))
  it('returns 0 for JPY', () => expect(getDecimalPlaces('JPY')).toBe(0))
  it('returns 0 for KRW', () => expect(getDecimalPlaces('KRW')).toBe(0))
  it('returns 0 for VND', () => expect(getDecimalPlaces('VND')).toBe(0))
  it('returns 3 for KWD', () => expect(getDecimalPlaces('KWD')).toBe(3))
  it('returns 3 for BHD', () => expect(getDecimalPlaces('BHD')).toBe(3))
  it('returns 3 for OMR', () => expect(getDecimalPlaces('OMR')).toBe(3))
  it('returns 2 for unknown currency', () => expect(getDecimalPlaces('XYZ')).toBe(2))
})

describe('formatCurrency', () => {
  it('formats USD cents correctly', () => {
    expect(formatCurrency(1234, 'USD', 'en-US')).toBe('$12.34')
  })

  it('formats JPY with no division (0 decimal places)', () => {
    const result = formatCurrency(1234, 'JPY', 'ja-JP')
    // ICU may use narrow (¥) or full-width (￥) symbol depending on Node version — both correct
    expect(result).toMatch(/[¥￥]1,234/)
    // Must NOT contain decimal point
    expect(result).not.toContain('.')
  })

  it('formats KWD with 3 decimal places', () => {
    const result = formatCurrency(12345, 'KWD', 'en-US')
    // KWD 12.345 — must contain 12.345
    expect(result).toContain('12.345')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0, 'USD', 'en-US')).toBe('$0.00')
  })

  it('formats large amounts', () => {
    expect(formatCurrency(100000, 'USD', 'en-US')).toBe('$1,000.00')
  })
})

describe('parseMoney', () => {
  it('parses USD string to cents', () => {
    const result = parseMoney('$12.34', 'USD')
    expect(result).toEqual({ ok: true, value: 1234 })
  })

  it('parses JPY — no division', () => {
    const result = parseMoney('1234', 'JPY')
    expect(result).toEqual({ ok: true, value: 1234 })
  })

  it('parses plain number string', () => {
    const result = parseMoney('12.34', 'USD')
    expect(result).toEqual({ ok: true, value: 1234 })
  })

  it('returns error for non-numeric input (abc strips to empty)', () => {
    const result = parseMoney('abc', 'USD')
    expect(result.ok).toBe(false)
  })

  it('returns error when cleaned value is non-parseable (dot only)', () => {
    const result = parseMoney('.', 'USD')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('Cannot parse')
    }
  })

  it('returns error for empty string', () => {
    expect(parseMoney('', 'USD').ok).toBe(false)
  })

  it('rounds to correct minor units', () => {
    // 12.345 KWD → 12345 fils
    const result = parseMoney('12.345', 'KWD')
    expect(result).toEqual({ ok: true, value: 12345 })
  })
})
