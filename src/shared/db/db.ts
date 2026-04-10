import Dexie, { type EntityTable } from 'dexie'
import type { Transaction } from '@/shared/types/transaction'
import type { SyncQueueEntry } from '@/shared/types/sync'
import type { UserSettings } from '@/shared/types/settings'
import { DB_NAME, DB_VERSION, DB_STORES } from './schema'

type MetadataRow = UserSettings & { key: string }

export class AppDb extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>
  syncQueue!: EntityTable<SyncQueueEntry, 'id'>
  metadata!: EntityTable<MetadataRow, 'key'>

  constructor(name = DB_NAME) {
    super(name)
    this.version(DB_VERSION).stores(DB_STORES)
  }
}

/** Singleton for application use. Tests create their own instance. */
export const db = new AppDb()
