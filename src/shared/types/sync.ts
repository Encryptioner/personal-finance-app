export type SyncStatus = 'idle' | 'queued' | 'syncing' | 'synced' | 'error'

export interface SyncQueueEntry {
  id: string
  txId: string
  op: 'upsert' | 'delete'
  status: 'pending' | 'failed'
  createdAt: string
  retryCount: number
  lastError?: string
}

export interface SyncState {
  status: SyncStatus
  lastSyncAt?: string
  pendingCount: number
  error?: string
}

import type { Transaction } from './transaction'

export interface DriveFileBody {
  schemaVersion: number
  lastModified: string
  devices: DeviceRecord[]
  transactions: Transaction[]
}

export interface DeviceRecord {
  id: string
  lastSeen: string
  userAgent: string
}
