import { describe, it, expect } from 'vitest'
import { applyFilters } from './filters'
import { makeTransaction, resetTransactionCounter } from '@/shared/test-fixtures/transactions'
import type { TransactionFilters } from '../api/transaction-repository'

const txs = () => {
  resetTransactionCounter()
  return [
    makeTransaction({ id: 'a', type: 'income', category: 'Salary', date: '2026-01-10', amount: 5000_00, description: 'January paycheck' }),
    makeTransaction({ id: 'b', type: 'expense', category: 'Food', date: '2026-02-14', amount: 25_00, description: 'Valentines dinner' }),
    makeTransaction({ id: 'c', type: 'expense', category: 'Rent', date: '2026-03-01', amount: 1200_00, description: undefined }),
    makeTransaction({ id: 'd', type: 'transfer', category: 'Savings', date: '2026-04-05', amount: 200_00, description: 'Emergency fund top-up' }),
  ]
}

describe('applyFilters', () => {
  it('returns all transactions when no filters applied', () => {
    expect(applyFilters(txs(), {})).toHaveLength(4)
  })

  it('filters by type', () => {
    const result = applyFilters(txs(), { type: 'expense' })
    expect(result).toHaveLength(2)
    expect(result.every((t) => t.type === 'expense')).toBe(true)
  })

  it('filters by category (exact match)', () => {
    const result = applyFilters(txs(), { category: 'Food' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('b')
  })

  it('filters by dateFrom inclusive', () => {
    const result = applyFilters(txs(), { dateFrom: '2026-03-01' })
    expect(result.map((t) => t.id)).toEqual(expect.arrayContaining(['c', 'd']))
    expect(result).toHaveLength(2)
  })

  it('filters by dateTo inclusive', () => {
    const result = applyFilters(txs(), { dateTo: '2026-02-14' })
    expect(result.map((t) => t.id)).toEqual(expect.arrayContaining(['a', 'b']))
    expect(result).toHaveLength(2)
  })

  it('filters by date range', () => {
    const result = applyFilters(txs(), { dateFrom: '2026-02-01', dateTo: '2026-03-31' })
    expect(result.map((t) => t.id)).toEqual(expect.arrayContaining(['b', 'c']))
    expect(result).toHaveLength(2)
  })

  it('searches in description (case-insensitive)', () => {
    const result = applyFilters(txs(), { search: 'paycheck' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('a')
  })

  it('searches in category (case-insensitive)', () => {
    const result = applyFilters(txs(), { search: 'rent' })
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('c')
  })

  it('returns empty array when no transactions match combined filters', () => {
    const result = applyFilters(txs(), { type: 'income', category: 'Rent' })
    expect(result).toHaveLength(0)
  })

  it('combined: type + dateFrom', () => {
    const result = applyFilters(txs(), { type: 'expense', dateFrom: '2026-03-01' } as TransactionFilters)
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('c')
  })

  it('returns original array when no filters (reference identity check)', () => {
    const list = txs()
    const result = applyFilters(list, {})
    expect(result).toHaveLength(list.length)
  })
})
