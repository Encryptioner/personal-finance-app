import { create } from 'zustand'
import { db } from '@/shared/db/db'
import { generateId } from '@/shared/lib/id'
import type { Transaction, TransactionInput, TransactionPatch } from '@/shared/types/transaction'
import { TransactionRepository } from '../api/transaction-repository'
import type { TransactionFilters } from '../api/transaction-repository'
import { applyFilters } from './filters'
import { sortTransactions } from './sorters'
import type { SortKey, SortDirection } from './sorters'
import { transactionEvents } from '../lib/transaction-events'

export interface TransactionState {
  /** All non-deleted transactions loaded from IndexedDB */
  transactions: Transaction[]
  filters: TransactionFilters
  sortKey: SortKey
  sortDirection: SortDirection
  loading: boolean
  error: string | null
}

interface TransactionActions {
  load(): Promise<void>
  add(input: TransactionInput, deviceId: string): Promise<Transaction>
  edit(id: string, patch: TransactionPatch, deviceId: string): Promise<void>
  remove(id: string): Promise<void>
  setFilters(filters: TransactionFilters): void
  setSort(key: SortKey, direction: SortDirection): void
}

const repo = new TransactionRepository(db)

export const useTransactionStore = create<TransactionState & TransactionActions>((set, get) => ({
  transactions: [],
  filters: {},
  sortKey: 'date',
  sortDirection: 'desc',
  loading: false,
  error: null,

  async load() {
    set({ loading: true, error: null })
    try {
      const transactions = await repo.list()
      set({ transactions, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load' })
    }
  },

  async add(input, deviceId) {
    const now = new Date().toISOString()
    const tx: Transaction = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      deviceId,
    }
    await repo.upsert(tx)
    set((s) => ({ transactions: [...s.transactions, tx] }))
    transactionEvents.emit(tx.id, 'upserted')
    return tx
  },

  async edit(id, patch, deviceId) {
    const existing = get().transactions.find((t) => t.id === id)
    if (!existing) return
    const updated: Transaction = { ...existing, ...patch, updatedAt: new Date().toISOString(), deviceId }
    await repo.upsert(updated)
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? updated : t)) }))
    transactionEvents.emit(id, 'upserted')
  },

  async remove(id) {
    await repo.softDelete(id)
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }))
    transactionEvents.emit(id, 'deleted')
  },

  setFilters(filters) {
    set({ filters })
  },

  setSort(sortKey, sortDirection) {
    set({ sortKey, sortDirection })
  },
}))

/**
 * Derive filtered + sorted view from store state.
 * Kept outside the store to avoid Zustand getter issues.
 */
export function selectVisible(state: TransactionState): Transaction[] {
  return sortTransactions(
    applyFilters(state.transactions, state.filters),
    state.sortKey,
    state.sortDirection,
  )
}
