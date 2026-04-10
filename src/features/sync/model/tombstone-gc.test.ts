import { describe, it, expect } from 'vitest'
import { findStaleTombstones } from './tombstone-gc'
import type { Transaction } from '@/shared/types/transaction'

describe('findStaleTombstones', () => {
  const now = new Date('2026-04-10T12:00:00Z')

  function deletedTx(overrides: {
    id: string
    deletedAt: string
  }): Transaction {
    return {
      id: overrides.id,
      type: 'expense',
      amount: 1000,
      currency: 'USD',
      date: '2026-04-10',
      category: 'food',
      createdAt: '2026-04-10T10:00:00Z',
      updatedAt: overrides.deletedAt,
      deviceId: 'device-a',
      deletedAt: overrides.deletedAt,
    }
  }

  function aliveTx(id: string): Transaction {
    return {
      id,
      type: 'expense',
      amount: 1000,
      currency: 'USD',
      date: '2026-04-10',
      category: 'food',
      createdAt: '2026-04-10T10:00:00Z',
      updatedAt: '2026-04-10T12:00:00Z',
      deviceId: 'device-a',
    }
  }

  it('returns empty array when given empty list', () => {
    const result = findStaleTombstones([], now)
    expect(result).toEqual([])
  })

  it('returns no tombstones when list has only alive transactions', () => {
    const list = [aliveTx('1'), aliveTx('2')]
    const result = findStaleTombstones(list, now)
    expect(result).toEqual([])
  })

  it('filters out tombstones older than 90 days', () => {
    const list = [
      deletedTx({
        id: '1',
        deletedAt: '2025-12-10T12:00:00Z', // 122 days ago
      }),
      deletedTx({
        id: '2',
        deletedAt: '2026-04-05T12:00:00Z', // 5 days ago
      }),
    ]

    const result = findStaleTombstones(list, now, 90)
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('1')
  })

  it('keeps tombstones younger than 90 days', () => {
    const list = [
      deletedTx({
        id: '1',
        deletedAt: '2026-04-10T11:00:00Z', // 1 hour ago
      }),
      deletedTx({
        id: '2',
        deletedAt: '2026-04-05T12:00:00Z', // 5 days ago
      }),
    ]

    const result = findStaleTombstones(list, now, 90)
    expect(result).toEqual([])
  })

  it('respects custom maxAgeDays', () => {
    const list = [
      deletedTx({
        id: '1',
        deletedAt: '2026-04-05T12:00:00Z', // 5 days ago
      }),
      deletedTx({
        id: '2',
        deletedAt: '2026-04-02T12:00:00Z', // 8 days ago
      }),
    ]

    const result = findStaleTombstones(list, now, 7)
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('2')
  })

  it('includes both tombstones and alive txs, filters only stale tombstones', () => {
    const list = [
      aliveTx('1'),
      deletedTx({
        id: '2',
        deletedAt: '2025-12-10T12:00:00Z', // stale
      }),
      aliveTx('3'),
      deletedTx({
        id: '4',
        deletedAt: '2026-04-05T12:00:00Z', // fresh
      }),
    ]

    const result = findStaleTombstones(list, now, 90)

    // Should return only the stale tombstone
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('2')
  })

  it('handles boundary: tombstone exactly 90 days old is stale', () => {
    const oldDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const list = [
      deletedTx({
        id: '1',
        deletedAt: oldDate,
      }),
    ]

    const result = findStaleTombstones(list, now, 90)
    expect(result).toHaveLength(1)
  })

  it('handles boundary: tombstone just before 90 days is fresh', () => {
    const almostOldDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000 - 1000)).toISOString()
    const list = [
      deletedTx({
        id: '1',
        deletedAt: almostOldDate,
      }),
    ]

    const result = findStaleTombstones(list, now, 90)
    expect(result).toHaveLength(0)
  })
})
