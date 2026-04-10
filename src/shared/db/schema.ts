import type { Transaction } from '@/shared/types/transaction'
import type { SyncQueueEntry } from '@/shared/types/sync'
import type { UserSettings } from '@/shared/types/settings'

/**
 * Dexie table type map — one entry per IndexedDB object store.
 * Increment DB_VERSION whenever the schema changes (add/remove stores or indexes).
 */
export interface AppDbSchema {
  transactions: Transaction
  syncQueue: SyncQueueEntry
  metadata: UserSettings & { key: string }
}

/**
 * Dexie store definitions (index declarations, not full schemas).
 * Syntax: "primaryKey, index1, index2, [compound+index]"
 * Prefix `++` for auto-increment, `&` for unique, `*` for multi-entry (array).
 */
export const DB_STORES = {
  /** Primary: id (UUID v7). Indexes for list views and sync. */
  transactions: 'id, date, type, category, updatedAt, deletedAt',
  /** Primary: id (UUID v7). Indexed by createdAt for drain-in-order. */
  syncQueue: 'id, createdAt',
  /** Key-value store: single row keyed by "settings". */
  metadata: 'key',
} as const satisfies Record<keyof AppDbSchema, string>

export const DB_NAME = 'pfa-db'
export const DB_VERSION = 1
