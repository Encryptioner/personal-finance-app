import { describe, it, expect } from 'vitest'
import { sortTransactions } from './sorters'
import { makeTransaction, resetTransactionCounter } from '@/shared/test-fixtures/transactions'

const txs = () => {
  resetTransactionCounter()
  return [
    makeTransaction({ id: 'a', date: '2026-03-10', amount: 500 }),
    makeTransaction({ id: 'b', date: '2026-01-01', amount: 1500 }),
    makeTransaction({ id: 'c', date: '2026-04-10', amount: 100 }),
  ]
}

describe('sortTransactions', () => {
  it('sorts by date descending (newest first)', () => {
    const result = sortTransactions(txs(), 'date', 'desc')
    expect(result.map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('sorts by date ascending (oldest first)', () => {
    const result = sortTransactions(txs(), 'date', 'asc')
    expect(result.map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })

  it('sorts by amount descending', () => {
    const result = sortTransactions(txs(), 'amount', 'desc')
    expect(result.map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })

  it('sorts by amount ascending', () => {
    const result = sortTransactions(txs(), 'amount', 'asc')
    expect(result.map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('does not mutate the input array', () => {
    const list = txs()
    const original = list.map((t) => t.id)
    sortTransactions(list, 'date', 'asc')
    expect(list.map((t) => t.id)).toEqual(original)
  })

  it('is stable — equal dates preserve original order', () => {
    resetTransactionCounter()
    const list = [
      makeTransaction({ id: 'x', date: '2026-04-10', amount: 100 }),
      makeTransaction({ id: 'y', date: '2026-04-10', amount: 200 }),
    ]
    const result = sortTransactions(list, 'date', 'asc')
    expect(result.map((t) => t.id)).toEqual(['x', 'y'])
  })
})
