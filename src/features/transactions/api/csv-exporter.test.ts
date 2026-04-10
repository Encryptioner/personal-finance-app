import { describe, it, expect } from 'vitest'
import { exportCsv } from './csv-exporter'
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
  },
]

const TOMBSTONE_TX: Transaction = {
  id: '019123ab-cdef1',
  type: 'expense',
  amount: 999,
  currency: 'USD',
  date: '2024-01-10',
  category: 'Old',
  description: 'Deleted item',
  createdAt: '2024-01-10T10:00:00Z',
  updatedAt: '2024-01-12T10:00:00Z',
  deviceId: 'device-1',
  deletedAt: '2024-01-12T10:00:00Z',
}

describe('exportCsv', () => {
  it('includes header row', () => {
    const csv = exportCsv(FIXTURE_TXS)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Date')
    expect(lines[0]).toContain('Amount')
    expect(lines[0]).toContain('Description')
    expect(lines[0]).toContain('Category')
    expect(lines[0]).toContain('Type')
  })

  it('exports all transactions as data rows', () => {
    const csv = exportCsv(FIXTURE_TXS)
    const lines = csv.split('\n').filter((l) => l.trim())
    // header + 2 data rows
    expect(lines).toHaveLength(3)
  })

  it('formats amount as decimal string (12.34)', () => {
    const csv = exportCsv(FIXTURE_TXS)
    const lines = csv.split('\n')
    // First data row should have 12.34
    expect(lines[1]).toContain('12.34')
  })

  it('excludes tombstones by default', () => {
    const csv = exportCsv([...FIXTURE_TXS, TOMBSTONE_TX])
    const lines = csv.split('\n').filter((l) => l.trim())
    expect(lines).toHaveLength(3) // header + 2 active rows
    expect(csv).not.toContain('Deleted item')
  })

  it('includes tombstones when flag is set', () => {
    const csv = exportCsv([...FIXTURE_TXS, TOMBSTONE_TX], {
      includeTombstones: true,
    })
    const lines = csv.split('\n').filter((l) => l.trim())
    expect(lines).toHaveLength(4) // header + 3 rows
    expect(csv).toContain('Deleted item')
  })

  it('produces RFC 4180 compliant output (proper quoting)', () => {
    const tx: Transaction = {
      id: 'test',
      type: 'expense',
      amount: 1000,
      currency: 'USD',
      date: '2024-01-15',
      category: 'Food',
      description: 'Lunch, with "friends"',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      deviceId: 'd1',
    }
    const csv = exportCsv([tx])
    // Description with comma and quotes should be properly quoted
    expect(csv).toContain('"Lunch, with ""friends"""')
  })

  it('round-trips: export → parse → matches original', () => {
    const csv = exportCsv(FIXTURE_TXS)
    // Simple parse check — verify data survived
    const lines = csv.split('\n').filter((l) => l.trim())
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('2024-01-15')
    expect(lines[1]).toContain('12.34')
    expect(lines[2]).toContain('5000.00')
    expect(lines[2]).toContain('Salary')
  })

  it('handles empty transaction list', () => {
    const csv = exportCsv([])
    const lines = csv.split('\n').filter((l) => l.trim())
    expect(lines).toHaveLength(1) // header only
  })
})
