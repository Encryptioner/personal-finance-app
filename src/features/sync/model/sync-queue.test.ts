import { describe, it, expect, beforeEach } from 'vitest'
import { createSyncQueue } from './sync-queue'
import { db } from '@/shared/db/db'

describe('SyncQueue', () => {
  beforeEach(async () => {
    // Clear the syncQueue table before each test
    await db.syncQueue.clear()
  })

  it('enqueues an upsert operation', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('upsert', 'tx-1')

    const items = await queue.listPending()
    expect(items).toHaveLength(1)
    expect(items[0]!.txId).toBe('tx-1')
    expect(items[0]!.op).toBe('upsert')
  })

  it('enqueues a delete operation', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('delete', 'tx-1')

    const items = await queue.listPending()
    expect(items).toHaveLength(1)
    expect(items[0]!.op).toBe('delete')
  })

  it('returns items in FIFO order', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('upsert', 'tx-1')
    await queue.enqueue('upsert', 'tx-2')
    await queue.enqueue('delete', 'tx-3')

    const items = await queue.listPending()
    expect(items.map((i) => i.txId)).toEqual(['tx-1', 'tx-2', 'tx-3'])
  })

  it('dequeues an item after successful sync', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('upsert', 'tx-1')

    const items = await queue.listPending()
    expect(items).toHaveLength(1)

    await queue.dequeue(items[0]!.id)

    const afterDequeue = await queue.listPending()
    expect(afterDequeue).toHaveLength(0)
  })

  it('tracks retry count', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('upsert', 'tx-1')

    const items = await queue.listPending()
    expect(items[0]!.retryCount).toBe(0)

    await queue.incrementRetry(items[0]!.id)
    const retried = await queue.listPending()
    expect(retried[0]!.retryCount).toBe(1)
  })

  it('caps retries at 5', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('upsert', 'tx-1')

    const items = await queue.listPending()
    const item = items[0]!

    for (let i: number = 0; i < 6; i++) {
      await queue.incrementRetry(item.id)
    }

    const retried = await queue.listPending()
    expect(retried[0]!.retryCount).toBe(5)
  })

  it('marks items as failed after max retries', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('upsert', 'tx-1')

    const items = await queue.listPending()
    const item = items[0]!

    for (let i: number = 0; i < 5; i++) {
      await queue.incrementRetry(item.id)
    }

    await queue.markFailed(item.id, 'Sync failed after 5 retries')

    const failed = await queue.listFailed()
    expect(failed).toHaveLength(1)
    expect(failed[0]!.lastError).toBe('Sync failed after 5 retries')
  })

  it('persists across queue recreation (durable)', async () => {
    const queue1 = createSyncQueue()
    await queue1.enqueue('upsert', 'tx-1')

    // Simulate app restart by creating a new queue instance
    const queue2 = createSyncQueue()
    const items = await queue2.listPending()

    expect(items).toHaveLength(1)
    expect(items[0]!.txId).toBe('tx-1')
  })

  it('handles empty queue gracefully', async () => {
    const queue = createSyncQueue()
    const items = await queue.listPending()
    expect(items).toHaveLength(0)
  })

  it('deduplicates pending ops for the same transaction', async () => {
    const queue = createSyncQueue()
    await queue.enqueue('upsert', 'tx-1')
    await queue.enqueue('upsert', 'tx-1') // Same tx again

    const items = await queue.listPending()
    // Should have only 1 pending for tx-1
    expect(items.filter((i) => i.txId === 'tx-1')).toHaveLength(1)
  })

  it('calculates exponential backoff', () => {
    const queue = createSyncQueue()
    const delay0 = queue.exponentialBackoff(0)
    const delay1 = queue.exponentialBackoff(1)
    const delay2 = queue.exponentialBackoff(2)

    expect(delay1).toBeGreaterThan(delay0)
    expect(delay2).toBeGreaterThan(delay1)
    expect(delay0).toBeGreaterThan(0)
  })
})
