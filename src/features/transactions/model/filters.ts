import type { Transaction } from '@/shared/types/transaction'
import type { TransactionFilters } from '../api/transaction-repository'

/**
 * Pure in-memory filter — applied by the store after loading from IndexedDB.
 * Keeps the store reactive to filter changes without re-querying the DB.
 */
export function applyFilters(transactions: Transaction[], filters: TransactionFilters): Transaction[] {
  let result = transactions

  if (filters.type) {
    const type = filters.type
    result = result.filter((tx) => tx.type === type)
  }

  if (filters.category) {
    const category = filters.category
    result = result.filter((tx) => tx.category === category)
  }

  if (filters.dateFrom) {
    const from = filters.dateFrom
    result = result.filter((tx) => tx.date >= from)
  }

  if (filters.dateTo) {
    const to = filters.dateTo
    result = result.filter((tx) => tx.date <= to)
  }

  if (filters.search) {
    const term = filters.search.toLowerCase()
    result = result.filter(
      (tx) =>
        (tx.description ?? '').toLowerCase().includes(term) ||
        tx.category.toLowerCase().includes(term),
    )
  }

  return result
}
