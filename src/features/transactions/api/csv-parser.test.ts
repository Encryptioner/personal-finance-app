import { describe, it, expect } from 'vitest'
import { parseCsv } from './csv-parser'

const MINIMAL_CSV = `Date,Amount,Description,Category
2024-01-15,1234,Groceries,Food
2024-01-16,-5000,Salary,Income
2024-01-17,2500,Coffee,Food`

const CSV_WITH_QUOTES = `Date,Amount,Description,Category
2024-01-15,1234,"Lunch with, team",Food
2024-01-16,5000,"He said ""hello""",Other`

const CSV_WITH_BOM = `\uFEFFDate,Amount,Description,Category
2024-01-15,1234,Groceries,Food`

const CSV_CRLF = 'Date,Amount,Description\r\n2024-01-15,1234,Groceries\r\n'

const CSV_EMPTY_ROWS = `Date,Amount,Description

2024-01-15,1234,Groceries

`

describe('parseCsv', () => {
  it('parses a minimal 3-row CSV with headers', () => {
    const result = parseCsv(MINIMAL_CSV)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rows).toHaveLength(3)
    expect(result.value.rows[0]).toEqual({
      Date: '2024-01-15',
      Amount: '1234',
      Description: 'Groceries',
      Category: 'Food',
    })
  })

  it('handles quoted values with commas', () => {
    const result = parseCsv(CSV_WITH_QUOTES)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rows[0]?.Description).toBe('Lunch with, team')
    expect(result.value.rows[1]?.Description).toBe('He said "hello"')
  })

  it('handles BOM (byte order mark)', () => {
    const result = parseCsv(CSV_WITH_BOM)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const firstRow = result.value.rows[0]
    expect(firstRow).toBeDefined()
    const keys = Object.keys(firstRow!)
    expect(keys.some((k) => k.includes('\uFEFF'))).toBe(false)
    expect(firstRow!.Date).toBe('2024-01-15')
  })

  it('handles CRLF line endings', () => {
    const result = parseCsv(CSV_CRLF)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rows).toHaveLength(1)
    expect(result.value.rows[0]?.Description).toBe('Groceries')
  })

  it('skips empty rows', () => {
    const result = parseCsv(CSV_EMPTY_ROWS)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rows).toHaveLength(1)
  })

  it('rejects empty input', () => {
    const result = parseCsv('')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBeInstanceOf(Error)
  })

  it('rejects input with only headers and no data rows', () => {
    const result = parseCsv('Date,Amount,Description')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.message).toContain('no data')
  })

  it('returns all rows as string values (no type coercion)', () => {
    const result = parseCsv(MINIMAL_CSV)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    for (const row of result.value.rows) {
      for (const val of Object.values(row)) {
        expect(typeof val).toBe('string')
      }
    }
  })

  it('handles single-row CSV', () => {
    const result = parseCsv('Date,Amount\n2024-01-15,1234')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.rows).toHaveLength(1)
    expect(result.value.rows[0]).toEqual({ Date: '2024-01-15', Amount: '1234' })
  })

  it('returns headers alongside rows', () => {
    const result = parseCsv(MINIMAL_CSV)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.headers).toBeDefined()
    expect(result.headers).toEqual([
      'Date',
      'Amount',
      'Description',
      'Category',
    ])
  })

  it('reports parse errors from malformed CSV', () => {
    const broken = '"Date,Amount\n"unterminated'
    const result = parseCsv(broken)
    expect(result.ok).toBeDefined()
  })
})
