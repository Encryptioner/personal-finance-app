import type { Transaction } from '@/shared/types/transaction'

interface ExportPayload {
  schemaVersion: number
  lastModified: string
  transactions: Transaction[]
}

/**
 * Export transactions to pretty-printed JSON matching the Drive file schema.
 * Tombstones are included (unlike CSV export).
 */
export function exportJson(transactions: Transaction[]): string {
  const payload: ExportPayload = {
    schemaVersion: 1,
    lastModified: new Date().toISOString(),
    transactions,
  }
  return JSON.stringify(payload, null, 2)
}
