import { describe, it, expect } from 'vitest'
import { mergeTransactions } from './merge'
import type { Transaction } from '@/shared/types/transaction'

// ─── Helpers ───────────────────────────────────────────────────

const DEVICE_A = 'device-a'
const DEVICE_B = 'device-b'
const DEVICE_C = 'device-c'

const NOW = '2026-04-10T12:00:00Z'

function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 1000,
    currency: 'USD',
    date: '2026-04-10',
    category: 'food',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: NOW,
    deviceId: DEVICE_A,
    ...overrides,
  }
}

function deletedTx(
  overrides: Partial<Transaction> & { id: string },
  deletedAt: string,
): Transaction {
  return tx({ ...overrides, deletedAt })
}

// ─── Empty cases ──────────────────────────────────────────────

describe('mergeTransactions', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(mergeTransactions([], [])).toEqual([])
  })

  it('returns local when remote is empty', () => {
    const local = [tx({ id: '1' })]
    expect(mergeTransactions(local, [])).toEqual(local)
  })

  it('returns remote when local is empty', () => {
    const remote = [tx({ id: '1' })]
    expect(mergeTransactions([], remote)).toEqual(remote)
  })

  // ─── Non-conflicting union ──────────────────────────────────

  it('merges non-overlapping transactions from both sides', () => {
    const local = [tx({ id: '1' })]
    const remote = [tx({ id: '2' })]
    const result = mergeTransactions(local, remote)

    expect(result).toHaveLength(2)
    expect(result.map((t) => t.id).sort()).toEqual(['1', '2'])
  })

  // ─── LWW: same ID, different updatedAt ──────────────────────

  it('picks the transaction with later updatedAt (remote wins)', () => {
    const local = [tx({ id: '1', updatedAt: '2026-04-10T12:00:00Z' })]
    const remote = [tx({ id: '1', updatedAt: '2026-04-10T13:00:00Z' })]

    const result = mergeTransactions(local, remote)
    expect(result).toHaveLength(1)
    expect(result[0]!.updatedAt).toBe('2026-04-10T13:00:00Z')
  })

  it('picks the transaction with later updatedAt (local wins)', () => {
    const local = [tx({ id: '1', updatedAt: '2026-04-10T14:00:00Z' })]
    const remote = [tx({ id: '1', updatedAt: '2026-04-10T12:00:00Z' })]

    const result = mergeTransactions(local, remote)
    expect(result).toHaveLength(1)
    expect(result[0]!.updatedAt).toBe('2026-04-10T14:00:00Z')
  })

  // ─── Tiebreak: same updatedAt → deviceId lexicographic ──────

  it('tiebreaks by deviceId when updatedAt is identical (A < B)', () => {
    const local = [
      tx({ id: '1', updatedAt: NOW, deviceId: DEVICE_A }),
    ]
    const remote = [
      tx({ id: '1', updatedAt: NOW, deviceId: DEVICE_B, category: 'travel' }),
    ]

    const result = mergeTransactions(local, remote)
    expect(result).toHaveLength(1)
    // device-a < device-b → device-a (local) wins
    expect(result[0]!.deviceId).toBe(DEVICE_A)
  })

  it('tiebreaks by deviceId when updatedAt is identical (B < A)', () => {
    const local = [
      tx({ id: '1', updatedAt: NOW, deviceId: DEVICE_B }),
    ]
    const remote = [
      tx({ id: '1', updatedAt: NOW, deviceId: DEVICE_A, category: 'travel' }),
    ]

    const result = mergeTransactions(local, remote)
    expect(result).toHaveLength(1)
    // device-a < device-b → device-a (remote) wins
    expect(result[0]!.deviceId).toBe(DEVICE_A)
  })

  // ─── Tombstone semantics ────────────────────────────────────

  it('deletion wins over older edit (tombstone is newer)', () => {
    const local = [
      deletedTx({ id: '1', updatedAt: '2026-04-10T12:00:00Z' }, '2026-04-10T12:00:00Z'),
    ]
    const remote = [
      tx({ id: '1', updatedAt: '2026-04-10T11:00:00Z', category: 'travel' }),
    ]

    const result = mergeTransactions(local, remote)
    expect(result).toHaveLength(1)
    expect(result[0]!.deletedAt).toBe('2026-04-10T12:00:00Z')
  })

  it('newer edit beats older deletion (undelete)', () => {
    const local = [
      deletedTx({ id: '1', updatedAt: '2026-04-10T12:00:00Z' }, '2026-04-10T12:00:00Z'),
    ]
    const remote = [
      tx({ id: '1', updatedAt: '2026-04-10T13:00:00Z', category: 'travel' }),
    ]

    const result = mergeTransactions(local, remote)
    expect(result).toHaveLength(1)
    // Remote updatedAt is newer → remote wins (undelete)
    expect(result[0]!.deletedAt).toBeUndefined()
    expect(result[0]!.category).toBe('travel')
  })

  it('both deleted → keeps tombstone with max deletedAt', () => {
    const local = [
      deletedTx({ id: '1', updatedAt: '2026-04-10T12:00:00Z' }, '2026-04-10T12:00:00Z'),
    ]
    const remote = [
      deletedTx(
        { id: '1', updatedAt: '2026-04-10T13:00:00Z' },
        '2026-04-10T13:00:00Z',
      ),
    ]

    const result = mergeTransactions(local, remote)
    expect(result).toHaveLength(1)
    // Remote is newer overall → remote's deletedAt wins
    expect(result[0]!.deletedAt).toBe('2026-04-10T13:00:00Z')
  })

  // ─── Deduplication / idempotence ────────────────────────────

  it('deduplicates identical transactions from both sides', () => {
    const t = tx({ id: '1' })
    const result = mergeTransactions([t], [t])
    expect(result).toHaveLength(1)
  })

  // ─── Property-based: commutativity ──────────────────────────

  it('is commutative: merge(a, b) equals merge(b, a)', () => {
    const local = [
      tx({ id: '1', updatedAt: '2026-04-10T12:00:00Z', deviceId: DEVICE_A }),
      tx({ id: '2', updatedAt: '2026-04-10T13:00:00Z', deviceId: DEVICE_B }),
    ]
    const remote = [
      tx({ id: '2', updatedAt: '2026-04-10T14:00:00Z', deviceId: DEVICE_A }),
      tx({ id: '3', updatedAt: '2026-04-10T15:00:00Z', deviceId: DEVICE_C }),
    ]

    const ab = mergeTransactions(local, remote)
    const ba = mergeTransactions(remote, local)

    // Sort by id for stable comparison
    const sort = (arr: Transaction[]) =>
      [...arr].sort((a, b) => a.id.localeCompare(b.id))

    expect(sort(ab)).toEqual(sort(ba))
  })

  it('is associative: merge(merge(a, b), c) equals merge(a, merge(b, c))', () => {
    const a = [tx({ id: '1', updatedAt: '2026-04-10T10:00:00Z' })]
    const b = [tx({ id: '1', updatedAt: '2026-04-10T11:00:00Z' })]
    const c = [tx({ id: '1', updatedAt: '2026-04-10T12:00:00Z' })]

    const ab_c = mergeTransactions(mergeTransactions(a, b), c)
    const a_bc = mergeTransactions(a, mergeTransactions(b, c))

    expect(ab_c).toEqual(a_bc)
  })

  it('is idempotent: merge(a, a) equals a', () => {
    const a = [tx({ id: '1' }), tx({ id: '2', category: 'travel' })]
    expect(mergeTransactions(a, a)).toEqual(a)
  })

  // ─── Performance ────────────────────────────────────────────

  it('handles 5000 x 5000 merge in under 100ms', () => {
    const generateTxs = (prefix: string, count: number): Transaction[] =>
      Array.from({ length: count }, (_, i) =>
        tx({
          id: `${prefix}-${i}`,
          updatedAt: `2026-04-10T${String(Math.floor(i / 100)).padStart(2, '0')}:${String(i % 100).padStart(2, '0')}:00Z`,
          deviceId: prefix === 'local' ? DEVICE_A : DEVICE_B,
        }),
      )

    const local = generateTxs('local', 5000)
    const remote = generateTxs('remote', 5000)

    const start = performance.now()
    const result = mergeTransactions(local, remote)
    const elapsed = performance.now() - start

    expect(result).toHaveLength(10000)
    expect(elapsed).toBeLessThan(100)
  })

  // ─── Mixed scenarios ────────────────────────────────────────

  it('handles a mix of new, updated, deleted, and conflicting transactions', () => {
    const local = [
      tx({ id: '1', updatedAt: '2026-04-10T10:00:00Z' }), // local-only
      tx({ id: '2', updatedAt: '2026-04-10T12:00:00Z' }), // newer than remote
      tx({ id: '3', updatedAt: '2026-04-10T09:00:00Z' }), // older than remote
      deletedTx({ id: '4', updatedAt: '2026-04-10T14:00:00Z' }, '2026-04-10T14:00:00Z'), // delete beats older remote
      deletedTx({ id: '5', updatedAt: '2026-04-10T08:00:00Z' }, '2026-04-10T08:00:00Z'), // newer remote beats delete
    ]

    const remote = [
      tx({ id: '2', updatedAt: '2026-04-10T11:00:00Z' }), // local wins (12 > 11)
      tx({ id: '3', updatedAt: '2026-04-10T13:00:00Z' }), // remote wins (13 > 9)
      tx({ id: '4', updatedAt: '2026-04-10T10:00:00Z' }), // deletion wins (14 > 10)
      tx({ id: '5', updatedAt: '2026-04-10T12:00:00Z', category: 'health' }), // undelete (12 > 8)
      tx({ id: '6', updatedAt: '2026-04-10T15:00:00Z' }), // remote-only
    ]

    const result = mergeTransactions(local, remote)

    expect(result).toHaveLength(6)

    const byId = Object.fromEntries(result.map((t) => [t.id, t]))

    // id 1: local-only
    expect(byId['1']!.updatedAt).toBe('2026-04-10T10:00:00Z')

    // id 2: local wins (12 > 11)
    expect(byId['2']!.updatedAt).toBe('2026-04-10T12:00:00Z')

    // id 3: remote wins (13 > 9)
    expect(byId['3']!.updatedAt).toBe('2026-04-10T13:00:00Z')

    // id 4: deletion wins
    expect(byId['4']!.deletedAt).toBe('2026-04-10T14:00:00Z')

    // id 5: undelete (remote wins, no deletedAt)
    expect(byId['5']!.deletedAt).toBeUndefined()
    expect(byId['5']!.category).toBe('health')

    // id 6: remote-only
    expect(byId['6']!.updatedAt).toBe('2026-04-10T15:00:00Z')
  })
})
