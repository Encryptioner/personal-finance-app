import type { Transaction } from '@/shared/types/transaction'

/**
 * Pure merge function for Last-Write-Wins sync with per-transaction granularity.
 * Merges local and remote transaction arrays, resolving conflicts by:
 * 1. Latest `updatedAt` wins
 * 2. If tied, lexicographically smaller `deviceId` wins (deterministic tiebreaker)
 * 3. Tombstones (deletedAt present) follow the same LWW logic
 *
 * Properties:
 * - Commutative: merge(a, b) = merge(b, a)
 * - Associative: merge(merge(a, b), c) = merge(a, merge(b, c))
 * - Idempotent: merge(a, a) = a
 */
export function mergeTransactions(
  local: Transaction[],
  remote: Transaction[],
): Transaction[] {
  // Index both sides by id for O(1) lookup
  const localMap = new Map(local.map((tx) => [tx.id, tx]))
  const remoteMap = new Map(remote.map((tx) => [tx.id, tx]))

  // Collect all unique ids
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys()])

  const merged: Transaction[] = []

  for (const id of allIds) {
    const localTx = localMap.get(id)
    const remoteTx = remoteMap.get(id)

    if (!localTx) {
      // Remote-only
      merged.push(remoteTx!)
      continue
    }

    if (!remoteTx) {
      // Local-only
      merged.push(localTx)
      continue
    }

    // Both exist: pick winner by LWW with tiebreaker
    const winner = pickWinner(localTx, remoteTx)
    merged.push(winner)
  }

  return merged
}

/**
 * Deterministic conflict resolution:
 * 1. Compare updatedAt (later wins)
 * 2. If equal, compare deviceId lexicographically (smaller wins)
 */
function pickWinner(a: Transaction, b: Transaction): Transaction {
  const aTime = new Date(a.updatedAt).getTime()
  const bTime = new Date(b.updatedAt).getTime()

  if (aTime !== bTime) {
    // Later updatedAt wins
    return aTime > bTime ? a : b
  }

  // Tiebreak: lexicographically smaller deviceId wins
  return a.deviceId < b.deviceId ? a : b
}
