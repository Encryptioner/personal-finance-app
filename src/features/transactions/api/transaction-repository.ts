import type { AppDb } from '@/shared/db/db'
import type { Transaction } from '@/shared/types/transaction'
import type { TransactionType } from '@/shared/types/transaction'

export interface TransactionFilters {
  type?: TransactionType
  category?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface ListOptions {
  includeTombstones?: boolean
}

export class TransactionRepository {
  constructor(private readonly db: AppDb) {}

  async list(filters: TransactionFilters = {}, options: ListOptions = {}): Promise<Transaction[]> {
    let collection = this.db.transactions.toCollection()

    if (!options.includeTombstones) {
      collection = collection.filter((tx) => tx.deletedAt === undefined)
    }

    if (filters.type) {
      const type = filters.type
      collection = collection.filter((tx) => tx.type === type)
    }

    if (filters.category) {
      const category = filters.category
      collection = collection.filter((tx) => tx.category === category)
    }

    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ?? ''
      const to = filters.dateTo ?? '9999-99-99'
      collection = collection.filter((tx) => tx.date >= from && tx.date <= to)
    }

    if (filters.search) {
      const term = filters.search.toLowerCase()
      collection = collection.filter((tx) =>
        (tx.description ?? '').toLowerCase().includes(term) ||
        tx.category.toLowerCase().includes(term)
      )
    }

    return collection.toArray()
  }

  async get(id: string): Promise<Transaction | undefined> {
    return this.db.transactions.get(id)
  }

  async upsert(tx: Transaction): Promise<void> {
    const now = new Date().toISOString()
    const existing = await this.db.transactions.get(tx.id)
    if (existing) {
      await this.db.transactions.put({ ...tx, updatedAt: now })
    } else {
      await this.db.transactions.put({ ...tx, createdAt: now, updatedAt: now })
    }
  }

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString()
    await this.db.transactions.update(id, { deletedAt: now, updatedAt: now })
  }

  /**
   * Permanently removes the row. Used only by tombstone GC (Phase 5).
   * Never call this from UI code.
   */
  async hardDelete(id: string): Promise<void> {
    await this.db.transactions.delete(id)
  }
}
