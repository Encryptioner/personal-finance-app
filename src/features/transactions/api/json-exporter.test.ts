import { describe, it, expect } from 'vitest'
import { exportJson } from './json-exporter'
import type { Transaction } from '@/shared/types/transaction'

const FIXTURE_TXS: Transaction[] = [
  {
    id: '019123ab-cdef',
    type: 'expense',
    amount: 1234,
    currency: 'USD',
    date: '2024-01-15',
    category: 'Food',
    description: 'Groceries',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    deviceId: 'device-1',
  },
  {
    id: '019123ab-cdef0',
    type: 'income',
    amount: 500000,
    currency: 'USD',
    date: '2024-01-16',
    category: 'Salary',
    description: 'Monthly salary',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    deviceId: 'device-1',
    deletedAt: '2024-01-16T12:00:00Z',
  },
]

describe('exportJson', () => {
  it('produces valid JSON', () => {
    const json = exportJson(FIXTURE_TXS)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('includes transactions array', () => {
    const json = exportJson(FIXTURE_TXS)
    const parsed = JSON.parse(json) as { transactions: unknown[] }
    expect(parsed.transactions).toHaveLength(2)
  })

  it('includes tombstones', () => {
    const json = exportJson(FIXTURE_TXS)
    const parsed = JSON.parse(json) as {
      transactions: { deletedAt?: string }[]
    }
    expect(parsed.transactions[1]?.deletedAt).toBeDefined()
  })

  it('includes schema version', () => {
    const json = exportJson(FIXTURE_TXS)
    const parsed = JSON.parse(json) as { schemaVersion: number }
    expect(parsed.schemaVersion).toBe(1)
  })

  it('includes lastModified timestamp', () => {
    const json = exportJson(FIXTURE_TXS)
    const parsed = JSON.parse(json) as { lastModified: string }
    expect(parsed.lastModified).toBeDefined()
    expect(() => new Date(parsed.lastModified)).not.toThrow()
  })

  it('preserves all transaction fields', () => {
    const json = exportJson(FIXTURE_TXS)
    const parsed = JSON.parse(json) as {
      transactions: Transaction[]
    }
    const tx = parsed.transactions[0]!
    expect(tx.id).toBe('019123ab-cdef')
    expect(tx.type).toBe('expense')
    expect(tx.amount).toBe(1234)
    expect(tx.currency).toBe('USD')
    expect(tx.date).toBe('2024-01-15')
    expect(tx.category).toBe('Food')
    expect(tx.description).toBe('Groceries')
  })

  it('handles empty transaction list', () => {
    const json = exportJson([])
    const parsed = JSON.parse(json) as { transactions: unknown[] }
    expect(parsed.transactions).toHaveLength(0)
    expect(parsed.schemaVersion).toBe(1)
  })
})
