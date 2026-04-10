import type { Transaction } from '@/shared/types/transaction'

export interface DuplicatePair {
  incoming: Transaction
  existing: Transaction
}

/**
 * Key captures the financial identity of a transaction.
 * Description, notes, tags are intentionally excluded — same amount/date/category
 * from different bank export columns is a duplicate regardless of memo text.
 */
export function buildDuplicateKey(tx: Transaction): string {
  return `${tx.date}|${tx.amount}|${tx.currency}|${tx.type}|${tx.category}`
}

/**
 * O(n + m) duplicate detection via hash set.
 * Returns pairs of (incoming, existing) that share the same identity key.
 */
export function findDuplicates(
  existing: Transaction[],
  incoming: Transaction[],
): DuplicatePair[] {
  const existingMap = new Map<string, Transaction>()
  for (const tx of existing) {
    existingMap.set(buildDuplicateKey(tx), tx)
  }

  const duplicates: DuplicatePair[] = []
  for (const tx of incoming) {
    const match = existingMap.get(buildDuplicateKey(tx))
    if (match) {
      duplicates.push({ incoming: tx, existing: match })
    }
  }
  return duplicates
}
