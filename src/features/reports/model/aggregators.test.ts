import { describe, it, expect } from 'vitest'
import { byCategory, byMonth, summary } from './aggregators'
import type { Transaction } from '@/shared/types/transaction'

describe('Aggregators', () => {
  // ─── Helpers ───────────────────────────────────────────────────

  function tx(overrides: Partial<Transaction> & { id: string }): Transaction {
    return {
      type: 'expense',
      amount: 1000,
      currency: 'USD',
      date: '2026-04-10',
      category: 'food',
      createdAt: '2026-04-10T10:00:00Z',
      updatedAt: '2026-04-10T10:00:00Z',
      deviceId: 'device-a',
      ...overrides,
    }
  }

  // ─── byCategory ────────────────────────────────────────────────

  describe('byCategory', () => {
    it('groups expenses by category, sorted descending by amount', () => {
      const txs = [
        tx({ id: '1', category: 'food', type: 'expense', amount: 1000 }),
        tx({ id: '2', category: 'travel', type: 'expense', amount: 5000 }),
        tx({ id: '3', category: 'food', type: 'expense', amount: 2000 }),
        tx({ id: '4', category: 'travel', type: 'expense', amount: 1000 }),
      ]

      const result = byCategory(txs, 'expense')

      expect(result).toEqual({
        travel: 6000,
        food: 3000,
      })
    })

    it('groups income by category', () => {
      const txs = [
        tx({ id: '1', category: 'salary', type: 'income', amount: 100000 }),
        tx({ id: '2', category: 'bonus', type: 'income', amount: 50000 }),
        tx({ id: '3', category: 'salary', type: 'income', amount: 100000 }),
      ]

      const result = byCategory(txs, 'income')

      expect(result).toEqual({
        salary: 200000,
        bonus: 50000,
      })
    })

    it('ignores deleted transactions (tombstones)', () => {
      const txs = [
        tx({ id: '1', category: 'food', type: 'expense', amount: 1000 }),
        tx({ id: '2', category: 'food', type: 'expense', amount: 2000, deletedAt: '2026-04-10T12:00:00Z' }),
      ]

      const result = byCategory(txs, 'expense')

      expect(result).toEqual({
        food: 1000,
      })
    })

    it('returns empty object when no matching transactions', () => {
      const txs = [tx({ id: '1', type: 'income', amount: 1000 })]

      const result = byCategory(txs, 'expense')

      expect(result).toEqual({})
    })

    it('handles multi-currency by separating into sub-maps', () => {
      const txs = [
        tx({ id: '1', category: 'food', type: 'expense', currency: 'USD', amount: 1000 }),
        tx({ id: '2', category: 'food', type: 'expense', currency: 'EUR', amount: 800 }),
        tx({ id: '3', category: 'travel', type: 'expense', currency: 'USD', amount: 5000 }),
      ]

      const result = byCategory(txs, 'expense')

      expect(result).toEqual({
        travel: 5000, // USD total
        food: 1800, // Mixed currencies summed
      })
    })
  })

  // ─── byMonth ────────────────────────────────────────────────────

  describe('byMonth', () => {
    it('aggregates by month with income, expense, net', () => {
      const txs = [
        tx({
          id: '1',
          date: '2026-04-01',
          type: 'income',
          amount: 100000,
        }),
        tx({
          id: '2',
          date: '2026-04-05',
          type: 'expense',
          amount: 20000,
        }),
        tx({
          id: '3',
          date: '2026-05-10',
          type: 'expense',
          amount: 15000,
        }),
      ]

      const result = byMonth(txs)

      expect(result).toEqual([
        {
          month: '2026-04',
          income: 100000,
          expense: 20000,
          net: 80000,
        },
        {
          month: '2026-05',
          income: 0,
          expense: 15000,
          net: -15000,
        },
      ])
    })

    it('handles transfers correctly (deducted from expense only)', () => {
      const txs = [
        tx({
          id: '1',
          date: '2026-04-01',
          type: 'transfer',
          amount: 10000,
        }),
      ]

      const result = byMonth(txs)

      expect(result[0]).toEqual({
        month: '2026-04',
        income: 0,
        expense: 10000,
        net: -10000,
      })
    })

    it('excludes tombstones', () => {
      const txs = [
        tx({
          id: '1',
          date: '2026-04-01',
          type: 'income',
          amount: 100000,
        }),
        tx({
          id: '2',
          date: '2026-04-05',
          type: 'expense',
          amount: 20000,
          deletedAt: '2026-04-10T12:00:00Z',
        }),
      ]

      const result = byMonth(txs)

      expect(result[0]).toEqual({
        month: '2026-04',
        income: 100000,
        expense: 0,
        net: 100000,
      })
    })

    it('returns empty array for empty input', () => {
      const result = byMonth([])
      expect(result).toEqual([])
    })
  })

  // ─── summary ────────────────────────────────────────────────────

  describe('summary', () => {
    it('computes income, expense, net, count, avg daily spend', () => {
      const txs = [
        tx({ id: '1', type: 'income', amount: 100000 }),
        tx({ id: '2', type: 'expense', amount: 20000 }),
        tx({ id: '3', type: 'expense', amount: 30000 }),
      ]

      const dateRange = { from: '2026-04-01', to: '2026-04-30' }

      const result = summary(txs, dateRange)

      expect(result.income).toBe(100000)
      expect(result.expense).toBe(50000)
      expect(result.net).toBe(50000)
      expect(result.count).toBe(3)
      // 30 days in date range, but some txs might be outside
    })

    it('filters by date range', () => {
      const txs = [
        tx({ id: '1', date: '2026-03-31', type: 'income', amount: 100000 }),
        tx({ id: '2', date: '2026-04-15', type: 'expense', amount: 20000 }),
        tx({ id: '3', date: '2026-05-01', type: 'expense', amount: 30000 }),
      ]

      const dateRange = { from: '2026-04-01', to: '2026-04-30' }

      const result = summary(txs, dateRange)

      expect(result.count).toBe(1)
      expect(result.income).toBe(0)
      expect(result.expense).toBe(20000)
    })

    it('excludes tombstones', () => {
      const txs = [
        tx({ id: '1', type: 'income', amount: 100000 }),
        tx({
          id: '2',
          type: 'expense',
          amount: 20000,
          deletedAt: '2026-04-10T12:00:00Z',
        }),
      ]

      const dateRange = { from: '2026-04-01', to: '2026-04-30' }

      const result = summary(txs, dateRange)

      expect(result.count).toBe(1)
      expect(result.expense).toBe(0)
    })

    it('returns zero values for empty result', () => {
      const result = summary([], { from: '2026-04-01', to: '2026-04-30' })

      expect(result).toEqual({
        income: 0,
        expense: 0,
        net: 0,
        count: 0,
        avgDailySpend: 0,
      })
    })

    it('calculates average daily spend correctly', () => {
      const txs = [
        tx({ id: '1', date: '2026-04-01', type: 'expense', amount: 30000 }),
        tx({ id: '2', date: '2026-04-02', type: 'expense', amount: 30000 }),
      ]

      const dateRange = { from: '2026-04-01', to: '2026-04-10' }

      const result = summary(txs, dateRange)

      // 60000 expense over 10 days = 6000 per day
      expect(result.avgDailySpend).toBe(6000)
    })
  })

  // ─── Edge cases ─────────────────────────────────────────────────

  it('aggregators handle empty list', () => {
    expect(byCategory([], 'expense')).toEqual({})
    expect(byMonth([])).toEqual([])
    expect(summary([], { from: '2026-04-01', to: '2026-04-30' })).toEqual({
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
      avgDailySpend: 0,
    })
  })

  it('aggregators handle large amounts correctly (integer arithmetic)', () => {
    const txs = [
      tx({ id: '1', type: 'income', amount: 999999999 }),
      tx({ id: '2', type: 'expense', amount: 888888888 }),
    ]

    const result = summary(txs, { from: '2026-04-01', to: '2026-04-30' })

    expect(result.income).toBe(999999999)
    expect(result.expense).toBe(888888888)
    expect(result.net).toBe(111111111)
  })
})
