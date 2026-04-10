import Papa from 'papaparse'
import { type Result, err, ok } from '@/shared/types/result'

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

type ParseResult = Result<ParsedCsv> & { headers: string[] }

/**
 * Parse CSV string into headers + row records.
 * All values remain strings — type coercion is the column mapper's job.
 */
export function parseCsv(input: string): ParseResult {
  if (!input.trim()) {
    return Object.assign(err(new Error('CSV input is empty')), {
      headers: [] as string[],
    })
  }

  // Strip BOM if present
  const cleaned = input.replace(/^\uFEFF/, '')

  const result = Papa.parse<Record<string, string>>(cleaned, {
    header: true,
    skipEmptyLines: true,
  })

  if (result.errors.length > 0 && result.data.length === 0) {
    return Object.assign(
      err(
        new Error(`CSV parse error: ${result.errors[0]?.message ?? 'unknown'}`),
      ),
      { headers: [] as string[] },
    )
  }

  const rows = result.data
  if (rows.length === 0) {
    return Object.assign(err(new Error('CSV has headers but no data rows')), {
      headers: [] as string[],
    })
  }

  const headers = result.meta.fields ?? Object.keys(rows[0]!)

  return Object.assign(ok({ headers, rows }), { headers })
}
