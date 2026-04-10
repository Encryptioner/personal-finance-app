import { describe, it, expect, beforeEach } from 'vitest'
import { useTransactionStore } from './transaction-store'
import { makeTransaction, resetTransactionCounter } from '@/shared/test-fixtures/transactions'

// Reset store state between tests
function resetStore() {
  useTransactionStore.setState({
    transactions: [],
    filters: {},
    sortKey: 'date',
    sortDirection: 'desc',
    loading: false,
    error: null,
  })
}

describe('useTransactionStore', () => {
  beforeEach(() => {
    resetTransactionCounter()
    resetStore()
  })

  it('starts with empty transactions', () => {
    expect(useTransactionStore.getState().transactions).toHaveLength(0)
  })

  it('add() inserts a transaction into the store', async () => {
    const input = makeTransaction()
    // strip system fields to produce a TransactionInput
    const { id: _, createdAt: __, updatedAt: ___, deviceId: ____, ...txInput } = input
    await useTransactionStore.getState().add(txInput, 'test-device')
    expect(useTransactionStore.getState().transactions).toHaveLength(1)
  })

  it('added transaction has correct fields', async () => {
    const input = makeTransaction({ category: 'Rent', amount: 1200_00, type: 'expense' })
    const { id: _, createdAt: __, updatedAt: ___, deviceId: ____, ...txInput } = input
    const tx = await useTransactionStore.getState().add(txInput, 'test-device')
    expect(tx.category).toBe('Rent')
    expect(tx.amount).toBe(1200_00)
    expect(tx.deviceId).toBe('test-device')
    expect(tx.id).toBeTruthy()
  })

  it('edit() updates the transaction in the store', async () => {
    const input = makeTransaction({ category: 'Food', amount: 500 })
    const { id: _, createdAt: __, updatedAt: ___, deviceId: ____, ...txInput } = input
    const tx = await useTransactionStore.getState().add(txInput, 'device-a')
    await useTransactionStore.getState().edit(tx.id, { amount: 750 }, 'device-a')
    const updated = useTransactionStore.getState().transactions.find((t) => t.id === tx.id)
    expect(updated?.amount).toBe(750)
  })

  it('remove() excludes the transaction from the store', async () => {
    const input = makeTransaction()
    const { id: _, createdAt: __, updatedAt: ___, deviceId: ____, ...txInput } = input
    const tx = await useTransactionStore.getState().add(txInput, 'device-a')
    await useTransactionStore.getState().remove(tx.id)
    expect(useTransactionStore.getState().transactions).toHaveLength(0)
  })

  it('setFilters() updates filter state', () => {
    useTransactionStore.getState().setFilters({ type: 'income' })
    expect(useTransactionStore.getState().filters.type).toBe('income')
  })

  it('setSort() updates sort state', () => {
    useTransactionStore.getState().setSort('amount', 'asc')
    expect(useTransactionStore.getState().sortKey).toBe('amount')
    expect(useTransactionStore.getState().sortDirection).toBe('asc')
  })
})
