import { describe, it, expect, beforeEach } from 'vitest'
import { AppDb } from '@/shared/db/db'
import { makeTransaction, resetTransactionCounter } from '@/shared/test-fixtures/transactions'
import { TransactionRepository } from './transaction-repository'

describe('TransactionRepository', () => {
  let db: AppDb
  let repo: TransactionRepository

  beforeEach(async () => {
    resetTransactionCounter()
    db = new AppDb(`test-repo-${Math.random().toString(36).slice(2)}`)
    await db.open()
    repo = new TransactionRepository(db)
  })

  describe('list', () => {
    it('returns empty array when no transactions', async () => {
      const txs = await repo.list()
      expect(txs).toEqual([])
    })

    it('returns only non-deleted transactions by default', async () => {
      await db.transactions.bulkAdd([
        makeTransaction({ id: 'tx-1' }),
        makeTransaction({ id: 'tx-2', deletedAt: '2026-04-09T00:00:00Z' }),
      ])
      const txs = await repo.list()
      expect(txs).toHaveLength(1)
      expect(txs[0]?.id).toBe('tx-1')
    })

    it('filters by type', async () => {
      await db.transactions.bulkAdd([
        makeTransaction({ id: 'tx-inc', type: 'income' }),
        makeTransaction({ id: 'tx-exp', type: 'expense' }),
      ])
      const txs = await repo.list({ type: 'income' })
      expect(txs).toHaveLength(1)
      expect(txs[0]?.type).toBe('income')
    })

    it('filters by category', async () => {
      await db.transactions.bulkAdd([
        makeTransaction({ id: 'tx-food', category: 'Food' }),
        makeTransaction({ id: 'tx-rent', category: 'Rent' }),
      ])
      const txs = await repo.list({ category: 'Food' })
      expect(txs).toHaveLength(1)
      expect(txs[0]?.category).toBe('Food')
    })

    it('filters by date range', async () => {
      await db.transactions.bulkAdd([
        makeTransaction({ id: 'tx-jan', date: '2026-01-15' }),
        makeTransaction({ id: 'tx-mar', date: '2026-03-10' }),
        makeTransaction({ id: 'tx-apr', date: '2026-04-10' }),
      ])
      const txs = await repo.list({ dateFrom: '2026-02-01', dateTo: '2026-04-01' })
      expect(txs).toHaveLength(1)
      expect(txs[0]?.id).toBe('tx-mar')
    })

    it('filters by text search in description', async () => {
      await db.transactions.bulkAdd([
        makeTransaction({ id: 'tx-a', description: 'Grocery run' }),
        makeTransaction({ id: 'tx-b', description: 'Monthly rent' }),
      ])
      const txs = await repo.list({ search: 'grocery' })
      expect(txs).toHaveLength(1)
      expect(txs[0]?.id).toBe('tx-a')
    })

    it('returns all including deleted when includeTombstones is true', async () => {
      await db.transactions.bulkAdd([
        makeTransaction({ id: 'tx-1' }),
        makeTransaction({ id: 'tx-2', deletedAt: '2026-04-09T00:00:00Z' }),
      ])
      const txs = await repo.list({}, { includeTombstones: true })
      expect(txs).toHaveLength(2)
    })
  })

  describe('get', () => {
    it('returns the transaction by id', async () => {
      await db.transactions.add(makeTransaction({ id: 'tx-get' }))
      const tx = await repo.get('tx-get')
      expect(tx?.id).toBe('tx-get')
    })

    it('returns undefined for unknown id', async () => {
      expect(await repo.get('no-such-id')).toBeUndefined()
    })
  })

  describe('upsert (insert)', () => {
    it('inserts a new transaction with createdAt and updatedAt', async () => {
      const input = makeTransaction({ id: 'tx-new' })
      await repo.upsert(input)
      const found = await db.transactions.get('tx-new')
      expect(found).toBeDefined()
      expect(found?.createdAt).toBeTruthy()
      expect(found?.updatedAt).toBeTruthy()
    })

    it('updates an existing transaction and bumps updatedAt', async () => {
      const tx = makeTransaction({ id: 'tx-upd', updatedAt: '2026-01-01T00:00:00Z' })
      await db.transactions.add(tx)
      await repo.upsert({ ...tx, amount: 9999 })
      const found = await db.transactions.get('tx-upd')
      expect(found?.amount).toBe(9999)
      expect(found?.updatedAt).not.toBe('2026-01-01T00:00:00Z')
    })
  })

  describe('softDelete', () => {
    it('sets deletedAt on the transaction', async () => {
      await db.transactions.add(makeTransaction({ id: 'tx-del' }))
      await repo.softDelete('tx-del')
      const found = await db.transactions.get('tx-del')
      expect(found?.deletedAt).toBeTruthy()
    })

    it('does not actually remove the row (tombstone preserved)', async () => {
      await db.transactions.add(makeTransaction({ id: 'tx-tomb' }))
      await repo.softDelete('tx-tomb')
      const count = await db.transactions.count()
      expect(count).toBe(1)
    })
  })

  describe('hardDelete', () => {
    it('removes the row entirely', async () => {
      await db.transactions.add(makeTransaction({ id: 'tx-hard' }))
      await repo.hardDelete('tx-hard')
      expect(await db.transactions.get('tx-hard')).toBeUndefined()
    })
  })
})
