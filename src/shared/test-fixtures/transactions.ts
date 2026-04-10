import type { Transaction, TransactionType } from '@/shared/types/transaction'

let _counter = 0

/**
 * Factory for test Transaction objects.
 * Generates stable, unique IDs using a counter — not random UUIDs —
 * so test output is deterministic and snapshots don't drift.
 */
export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  _counter++
  const id = overrides.id ?? `00000000-0000-7000-8000-${String(_counter).padStart(12, '0')}`
  const now = '2026-04-10T10:00:00Z'
  return {
    id,
    type: 'expense' as TransactionType,
    amount: 1000,
    currency: 'USD',
    date: '2026-04-10',
    category: 'Food',
    createdAt: now,
    updatedAt: now,
    deviceId: 'test-device-a',
    ...overrides,
  }
}

/** Reset the counter — call in beforeEach if deterministic IDs matter across tests */
export function resetTransactionCounter(): void {
  _counter = 0
}
