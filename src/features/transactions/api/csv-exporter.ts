import Papa from 'papaparse'
import type { Transaction } from '@/shared/types/transaction'

export interface ExportCsvOptions {
  includeTombstones?: boolean
}

interface CsvRow {
  Date: string
  Type: string
  Amount: string
  Currency: string
  Category: string
  Description: string
  Tags: string
}

/**
 * Export transactions to RFC 4180 CSV string.
 * Amounts are formatted as decimal (12.34), not minor units.
 * Tombstones (deletedAt present) are excluded by default.
 */
export function exportCsv(
  transactions: Transaction[],
  options: ExportCsvOptions = {},
): string {
  const filtered = options.includeTombstones
    ? transactions
    : transactions.filter((tx) => !tx.deletedAt)

  const rows: CsvRow[] = filtered.map((tx) => ({
    Date: tx.date,
    Type: tx.type,
    Amount: formatDecimal(tx.amount),
    Currency: tx.currency,
    Category: tx.category,
    Description: tx.description ?? '',
    Tags: tx.tags?.join('; ') ?? '',
  }))

  const header = 'Date,Type,Amount,Currency,Category,Description,Tags'
  if (rows.length === 0) return header

  return Papa.unparse(rows, {
    columns: ['Date', 'Type', 'Amount', 'Currency', 'Category', 'Description', 'Tags'],
    header: true,
  })
}

/** Convert minor units (1234) to decimal string ("12.34"). */
function formatDecimal(minorUnits: number): string {
  const major = Math.trunc(minorUnits / 100)
  const minor = Math.abs(minorUnits % 100)
  return `${major}.${minor.toString().padStart(2, '0')}`
}
