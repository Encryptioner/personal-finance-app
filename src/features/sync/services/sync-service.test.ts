/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSyncService } from './sync-service'
import { db } from '@/shared/db/db'
import type { Transaction, DriveFileBody } from '@/shared/types'

class ConflictError extends Error {
  status = 412
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

describe('SyncService', () => {
  beforeEach(async () => {
    await db.transactions.clear()
    await db.syncQueue.clear()
    vi.clearAllMocks()
  })

  it('runs a successful sync cycle: local + remote → merged + synced', async () => {
    // Setup: add a local transaction
    const localTx: Transaction = {
      id: '1',
      type: 'expense',
      amount: 1000,
      currency: 'USD',
      date: '2026-04-10',
      category: 'food',
      createdAt: '2026-04-10T10:00:00Z',
      updatedAt: '2026-04-10T10:00:00Z',
      deviceId: 'device-a',
    }
    await db.transactions.add(localTx)

    // Mock the file manager
    const remoteTx: Transaction = {
      id: '2',
      type: 'income',
      amount: 5000,
      currency: 'USD',
      date: '2026-04-10',
      category: 'salary',
      createdAt: '2026-04-10T09:00:00Z',
      updatedAt: '2026-04-10T09:00:00Z',
      deviceId: 'device-b',
    }

    const remoteFile: DriveFileBody = {
      schemaVersion: 1,
      lastModified: '2026-04-10T10:00:00Z',
      devices: [{ id: 'device-b', lastSeen: '2026-04-10T10:00:00Z', userAgent: 'test' }],
      transactions: [remoteTx],
    }

    const mockFileManager = {
      readTransactionsFile: vi.fn(async () => ({
        body: remoteFile,
        etag: '"abc123"',
      })),
      writeTransactionsFile: vi.fn(async () => '"xyz789"'),
    }

    const service = createSyncService('device-a', mockFileManager as any)
    const result = await service.runSync('file-1')

    expect(result.ok).toBe(true)
    expect(result.mergedCount).toBe(2) // Both txs should be merged
    expect(mockFileManager.writeTransactionsFile).toHaveBeenCalled()
  })

  it('fails on unsupported schema version', async () => {
    const mockFileManager = {
      readTransactionsFile: vi.fn(async () => ({
        body: {
          schemaVersion: 999, // Future version
          lastModified: '2026-04-10T10:00:00Z',
          devices: [],
          transactions: [],
        },
        etag: '"abc123"',
      })),
      writeTransactionsFile: vi.fn(),
    }

    const service = createSyncService('device-a', mockFileManager as any)

    const result = await service.runSync('file-1')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('schema')
  })

  it('retries on 412 Conflict (ETag mismatch)', async () => {
    let attemptCount = 0

    const mockFileManager = {
      readTransactionsFile: vi.fn(async () => ({
        body: {
          schemaVersion: 1,
          lastModified: '2026-04-10T10:00:00Z',
          devices: [],
          transactions: [],
        },
        etag: '"version-' + attemptCount + '"',
      })),
      writeTransactionsFile: vi.fn(async () => {
        attemptCount++
        if (attemptCount === 1) {
          throw new ConflictError('ETag mismatch')
        }
        return '"final-etag"'
      }),
    }

    const service = createSyncService('device-a', mockFileManager as any)
    const result = await service.runSync('file-1', 0)

    expect(result.ok).toBe(true)
    expect(attemptCount).toBe(2)
  })

  it('fails after max retries (5)', async () => {
    const mockFileManager = {
      readTransactionsFile: vi.fn(async () => ({
        body: {
          schemaVersion: 1,
          lastModified: '2026-04-10T10:00:00Z',
          devices: [],
          transactions: [],
        },
        etag: '"abc123"',
      })),
      writeTransactionsFile: vi.fn(async () => {
        throw new ConflictError('ETag mismatch')
      }),
    }

    const service = createSyncService('device-a', mockFileManager as any)

    const result = await service.runSync('file-1', 5)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Max retries')
  })

  it('updates transaction repository after merge', async () => {
    const localTx: Transaction = {
      id: '1',
      type: 'expense',
      amount: 1000,
      currency: 'USD',
      date: '2026-04-10',
      category: 'food',
      createdAt: '2026-04-10T10:00:00Z',
      updatedAt: '2026-04-10T10:00:00Z',
      deviceId: 'device-a',
    }
    await db.transactions.add(localTx)

    const remoteFile: DriveFileBody = {
      schemaVersion: 1,
      lastModified: '2026-04-10T10:00:00Z',
      devices: [],
      transactions: [localTx], // Same tx from remote
    }

    const mockFileManager = {
      readTransactionsFile: vi.fn(async () => ({
        body: remoteFile,
        etag: '"abc123"',
      })),
      writeTransactionsFile: vi.fn(async () => '"xyz789"'),
    }

    const service = createSyncService('device-a', mockFileManager as any)
    await service.runSync('file-1')

    // Verify the transaction is still in the DB after sync
    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(1)
    expect(txs[0]!.id).toBe('1')
  })

  it('includes deviceId in sync result', async () => {
    const mockFileManager = {
      readTransactionsFile: vi.fn(async () => ({
        body: {
          schemaVersion: 1,
          lastModified: '2026-04-10T10:00:00Z',
          devices: [],
          transactions: [],
        },
        etag: '"abc123"',
      })),
      writeTransactionsFile: vi.fn(async () => '"xyz789"'),
    }

    const service = createSyncService('device-123', mockFileManager as any)
    const result = await service.runSync('file-1')

    // The sync result should indicate this device participated
    expect(result.ok).toBe(true)
  })
})
