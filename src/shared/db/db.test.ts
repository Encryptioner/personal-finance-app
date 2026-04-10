import { describe, it, expect, beforeEach } from 'vitest'
import { AppDb } from './db'
import type { Transaction } from '@/shared/types/transaction'
import type { SyncQueueEntry } from '@/shared/types/sync'

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx-${Math.random().toString(36).slice(2)}`,
    type: 'expense',
    amount: 1000,
    currency: 'USD',
    date: '2026-04-10',
    category: 'Food',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-10T10:00:00Z',
    deviceId: 'test-device',
    ...overrides,
  }
}

describe('AppDb', () => {
  let db: AppDb

  beforeEach(async () => {
    // Each test gets a fresh in-memory DB instance
    db = new AppDb(`test-${Math.random().toString(36).slice(2)}`)
    await db.open()
  })

  describe('transactions table', () => {
    it('adds and retrieves a transaction', async () => {
      const tx = makeTransaction({ id: 'tx-001' })
      await db.transactions.add(tx)
      const found = await db.transactions.get('tx-001')
      expect(found?.id).toBe('tx-001')
      expect(found?.amount).toBe(1000)
    })

    it('bulk-adds multiple transactions', async () => {
      const txs = [makeTransaction({ id: 'tx-a' }), makeTransaction({ id: 'tx-b' })]
      await db.transactions.bulkAdd(txs)
      const count = await db.transactions.count()
      expect(count).toBe(2)
    })

    it('updates a transaction', async () => {
      const tx = makeTransaction({ id: 'tx-upd' })
      await db.transactions.add(tx)
      await db.transactions.update('tx-upd', { amount: 2000 })
      const updated = await db.transactions.get('tx-upd')
      expect(updated?.amount).toBe(2000)
    })

    it('soft-deletes by setting deletedAt', async () => {
      const tx = makeTransaction({ id: 'tx-del' })
      await db.transactions.add(tx)
      await db.transactions.update('tx-del', { deletedAt: '2026-04-11T00:00:00Z' })
      const found = await db.transactions.get('tx-del')
      expect(found?.deletedAt).toBe('2026-04-11T00:00:00Z')
    })

    it('filters by date index', async () => {
      await db.transactions.bulkAdd([
        makeTransaction({ id: 'tx-1', date: '2026-01-01' }),
        makeTransaction({ id: 'tx-2', date: '2026-03-15' }),
        makeTransaction({ id: 'tx-3', date: '2026-04-10' }),
      ])
      const result = await db.transactions.where('date').above('2026-02-01').toArray()
      expect(result.length).toBe(2)
    })
  })

  describe('syncQueue table', () => {
    it('adds and retrieves queue entries', async () => {
      const entry: SyncQueueEntry = {
        id: 'sq-001',
        txId: 'tx-001',
        op: 'upsert',
        createdAt: '2026-04-10T10:00:00Z',
        retryCount: 0,
        status: 'pending',
      }
      await db.syncQueue.add(entry)
      const count = await db.syncQueue.count()
      expect(count).toBe(1)
    })

    it('retrieves entries ordered by createdAt', async () => {
      const entries: SyncQueueEntry[] = [
        { id: 'sq-2', txId: 'tx-2', op: 'upsert', createdAt: '2026-04-10T11:00:00Z', retryCount: 0, status: 'pending' },
        { id: 'sq-1', txId: 'tx-1', op: 'upsert', createdAt: '2026-04-10T09:00:00Z', retryCount: 0, status: 'pending' },
      ]
      await db.syncQueue.bulkAdd(entries)
      const ordered = await db.syncQueue.orderBy('createdAt').toArray()
      expect(ordered[0]?.id).toBe('sq-1')
      expect(ordered[1]?.id).toBe('sq-2')
    })
  })

  describe('metadata table', () => {
    it('stores and retrieves settings by key', async () => {
      await db.metadata.put({
        key: 'settings',
        currency: 'BDT',
        locale: 'bn-BD',
        theme: 'dark',
        deviceId: 'device-xyz',
        dismissedSignInBanner: false,
      })
      const row = await db.metadata.get('settings')
      expect(row?.currency).toBe('BDT')
      expect(row?.theme).toBe('dark')
    })

    it('overwrites existing settings on put', async () => {
      await db.metadata.put({ key: 'settings', currency: 'USD', locale: 'en-US', theme: 'system', deviceId: 'd1', dismissedSignInBanner: false })
      await db.metadata.put({ key: 'settings', currency: 'EUR', locale: 'de-DE', theme: 'light', deviceId: 'd1', dismissedSignInBanner: true })
      const row = await db.metadata.get('settings')
      expect(row?.currency).toBe('EUR')
    })
  })
})
