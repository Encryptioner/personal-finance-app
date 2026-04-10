import { v7 } from 'uuid'
import { db } from '@/shared/db/db'
import type { SyncQueueEntry } from '@/shared/types/sync'

const BASE_DELAY_MS = 1000
const MAX_BACKOFF_MS = 60000

/**
 * Sync queue — thin wrapper over Dexie `syncQueue` table.
 * Enqueues upsert/delete operations, maintains FIFO order via createdAt,
 * tracks retries with exponential backoff, and survives app restart.
 */
export function createSyncQueue() {
  return {
    /**
     * Add an operation to the queue (or update if same txId exists).
     */
    async enqueue(op: 'upsert' | 'delete', txId: string): Promise<void> {
      // Check if we already have a pending op for this tx
      const existing = await db.syncQueue
        .where('txId')
        .equals(txId)
        .filter((entry) => entry.status === 'pending')
        .first()

      if (existing) {
        // Update existing to latest op
        await db.syncQueue.update(existing.id, { op })
      } else {
        // Create new entry
        const entry: SyncQueueEntry = {
          id: v7(),
          txId,
          op,
          status: 'pending',
          createdAt: new Date().toISOString(),
          retryCount: 0,
        }
        await db.syncQueue.add(entry)
      }
    },

    /**
     * List all pending (not yet failed) operations in FIFO order.
     */
    async listPending(): Promise<SyncQueueEntry[]> {
      return db.syncQueue
        .where('status')
        .equals('pending')
        .toArray()
    },

    /**
     * List all failed operations.
     */
    async listFailed(): Promise<SyncQueueEntry[]> {
      return db.syncQueue
        .where('status')
        .equals('failed')
        .toArray()
    },

    /**
     * Remove an entry from the queue (after successful sync).
     */
    async dequeue(id: string): Promise<void> {
      await db.syncQueue.delete(id)
    },

    /**
     * Increment retry count for an entry.
     */
    async incrementRetry(id: string): Promise<void> {
      const entry = await db.syncQueue.get(id)
      if (!entry) return

      const newCount = Math.min(entry.retryCount + 1, 5)
      await db.syncQueue.update(id, { retryCount: newCount })
    },

    /**
     * Mark an entry as failed with an error message.
     */
    async markFailed(id: string, error: string): Promise<void> {
      await db.syncQueue.update(id, {
        status: 'failed',
        lastError: error,
      })
    },

    /**
     * Calculate exponential backoff delay in milliseconds.
     * Grows as 2^retryCount, capped at MAX_BACKOFF_MS.
     */
    exponentialBackoff(retryCount: number): number {
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount)
      return Math.min(delay, MAX_BACKOFF_MS)
    },
  }
}

export type SyncQueue = ReturnType<typeof createSyncQueue>
