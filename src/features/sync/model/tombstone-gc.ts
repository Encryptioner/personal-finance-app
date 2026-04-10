import type { Transaction } from '@/shared/types/transaction'

/**
 * Find tombstones (deleted transactions) that are older than maxAgeDays.
 * These are eligible for permanent deletion from the sync file.
 *
 * Note: This function only returns the stale tombstones; it does not modify
 * the input array. The caller is responsible for removing them.
 *
 * @param transactions - array of transactions (including tombstones with deletedAt)
 * @param now - current timestamp for age calculation
 * @param maxAgeDays - maximum age in days before a tombstone is considered stale (default: 90)
 * @returns array of transactions that are deleted AND older than maxAgeDays
 */
export function findStaleTombstones(
  transactions: Transaction[],
  now: Date,
  maxAgeDays: number = 90,
): Transaction[] {
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
  const nowMs = now.getTime()

  return transactions.filter((tx) => {
    // Only consider tombstones (deleted transactions)
    if (!tx.deletedAt) return false

    const deletedAtMs = new Date(tx.deletedAt).getTime()
    const ageMs = nowMs - deletedAtMs

    return ageMs >= maxAgeMs
  })
}

/**
 * Remove stale tombstones from a transaction list.
 * Convenience wrapper around findStaleTombstones for in-place filtering.
 *
 * @param transactions - array of transactions
 * @param now - current timestamp for age calculation
 * @param maxAgeDays - maximum age in days (default: 90)
 * @returns new array with stale tombstones removed
 */
export function removeStaleTombstones(
  transactions: Transaction[],
  now: Date,
  maxAgeDays: number = 90,
): Transaction[] {
  const stale = findStaleTombstones(transactions, now, maxAgeDays)
  const staleIds = new Set(stale.map((t) => t.id))
  return transactions.filter((tx) => !staleIds.has(tx.id))
}
