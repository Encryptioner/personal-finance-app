import { describe, it, expect } from 'vitest'
import { detectDateFormat } from './date-format-detection'

describe('detectDateFormat', () => {
  it('detects ISO format (YYYY-MM-DD)', () => {
    const result = detectDateFormat([
      '2024-01-15',
      '2024-02-20',
      '2024-12-01',
    ])
    expect(result).toBe('iso')
  })

  it('detects US format (MM/DD/YYYY)', () => {
    const result = detectDateFormat([
      '01/15/2024',
      '02/20/2024',
      '12/01/2024',
    ])
    expect(result).toBe('us')
  })

  it('detects EU format (DD/MM/YYYY) when first number > 12', () => {
    const result = detectDateFormat([
      '15/01/2024',
      '20/02/2024',
      '31/12/2024',
    ])
    expect(result).toBe('eu')
  })

  it('returns "ambiguous" when US and EU are both possible', () => {
    // All days ≤ 12 and all months ≤ 12 — could be either
    const result = detectDateFormat([
      '01/02/2024',
      '03/04/2024',
      '05/06/2024',
    ])
    expect(result).toBe('ambiguous')
  })

  it('returns "ambiguous" for mixed formats', () => {
    const result = detectDateFormat([
      '2024-01-15',
      '01/15/2024',
    ])
    expect(result).toBe('ambiguous')
  })

  it('returns "ambiguous" for single ambiguous date', () => {
    const result = detectDateFormat(['01/02/2024'])
    expect(result).toBe('ambiguous')
  })

  it('returns "iso" for single ISO date', () => {
    const result = detectDateFormat(['2024-01-15'])
    expect(result).toBe('iso')
  })

  it('returns "eu" when EU pattern is unambiguous', () => {
    // 13th month is impossible → must be DD/MM
    const result = detectDateFormat(['13/01/2024'])
    expect(result).toBe('eu')
  })

  it('handles empty array', () => {
    const result = detectDateFormat([])
    expect(result).toBe('ambiguous')
  })

  it('detects ISO with single value', () => {
    const result = detectDateFormat(['2024-06-15'])
    expect(result).toBe('iso')
  })

  it('handles date with dots as EU variant (DD.MM.YYYY)', () => {
    const result = detectDateFormat([
      '15.01.2024',
      '20.06.2024',
      '31.12.2024',
    ])
    expect(result).toBe('eu')
  })

  it('handles date with dashes as EU variant (DD-MM-YYYY)', () => {
    // This is tricky because YYYY-MM-DD uses dashes too.
    // Only detect as EU if first segment > 12 (can't be a month)
    const result = detectDateFormat([
      '15-01-2024',
    ])
    expect(result).toBe('eu')
  })
})
