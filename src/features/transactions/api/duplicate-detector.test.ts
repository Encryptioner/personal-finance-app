import { describe, it, expect } from 'vitest'
import { findDuplicates, buildDuplicateKey } from './duplicate-detector'
import { makeTransaction } from '@/shared/test-fixtures/transactions'

describe('buildDuplicateKey', () => {
  it('produces key from date, amount, currency, type, category', () => {
    const tx = makeTransaction({ date: '2026-04-10', amount: 1234, currency: 'USD', type: 'expense', category: 'Food' })
    expect(buildDuplicateKey(tx)).toBe('2026-04-10|1234|USD|expense|Food')
  })
})

describe('findDuplicates', () => {
  it('returns empty array for empty input', () => {
    expect(findDuplicates([], [])).toEqual([])
  })

  it('returns empty array when no new transactions match existing', () => {
    const existing = [makeTransaction({ id: 'ex-1', date: '2026-01-01', amount: 500, currency: 'USD', type: 'expense', category: 'Food' })]
    const incoming = [makeTransaction({ id: 'new-1', date: '2026-01-02', amount: 500, currency: 'USD', type: 'expense', category: 'Food' })]
    expect(findDuplicates(existing, incoming)).toEqual([])
  })

  it('detects duplicate when date, amount, currency, type, and category all match', () => {
    const tx = makeTransaction({ id: 'ex-1', date: '2026-04-10', amount: 1234, currency: 'USD', type: 'expense', category: 'Food' })
    const incoming = [makeTransaction({ ...tx, id: 'new-1' })]
    const dups = findDuplicates([tx], incoming)
    expect(dups).toHaveLength(1)
    expect(dups[0]?.incoming.id).toBe('new-1')
    expect(dups[0]?.existing.id).toBe('ex-1')
  })

  it('does NOT flag as duplicate when amounts differ', () => {
    const existing = [makeTransaction({ id: 'ex-1', amount: 1000 })]
    const incoming = [makeTransaction({ id: 'new-1', amount: 2000 })]
    expect(findDuplicates(existing, incoming)).toEqual([])
  })

  it('does NOT flag as duplicate when currency differs', () => {
    const existing = [makeTransaction({ id: 'ex-1', currency: 'USD' })]
    const incoming = [makeTransaction({ id: 'new-1', currency: 'EUR' })]
    expect(findDuplicates(existing, incoming)).toEqual([])
  })

  it('does NOT flag as duplicate when type differs', () => {
    const existing = [makeTransaction({ id: 'ex-1', type: 'income' })]
    const incoming = [makeTransaction({ id: 'new-1', type: 'expense' })]
    expect(findDuplicates(existing, incoming)).toEqual([])
  })

  it('ignores description differences — description is NOT part of the key', () => {
    const base = { date: '2026-04-10', amount: 1234, currency: 'USD', type: 'expense' as const, category: 'Food' }
    const existing = [makeTransaction({ id: 'ex-1', ...base, description: 'Lunch' })]
    const incoming = [makeTransaction({ id: 'new-1', ...base, description: 'Dinner' })]
    const dups = findDuplicates(existing, incoming)
    expect(dups).toHaveLength(1)
  })

  it('handles 1000 existing × 100 new in under 200ms', () => {
    const existing = Array.from({ length: 1000 }, (_, i) =>
      makeTransaction({ id: `ex-${i}`, date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, amount: i * 10 + 1 })
    )
    const incoming = Array.from({ length: 100 }, (_, i) =>
      makeTransaction({ id: `new-${i}`, date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`, amount: i * 7 + 3 })
    )
    const start = performance.now()
    findDuplicates(existing, incoming)
    expect(performance.now() - start).toBeLessThan(200)
  })
})
