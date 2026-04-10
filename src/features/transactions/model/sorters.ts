import type { Transaction } from '@/shared/types/transaction'

export type SortKey = 'date' | 'amount'
export type SortDirection = 'asc' | 'desc'

/**
 * Returns a new sorted array — never mutates the input.
 * Uses a stable sort (Array.prototype.sort is stable in V8 for ≥ 10 elements since Node 11).
 */
export function sortTransactions(
  transactions: Transaction[],
  key: SortKey,
  direction: SortDirection,
): Transaction[] {
  const copy = [...transactions]
  const sign = direction === 'asc' ? 1 : -1
  copy.sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av < bv) return -sign
    if (av > bv) return sign
    return 0
  })
  return copy
}
