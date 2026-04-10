/**
 * Simple typed event bus for transaction mutations.
 * Phase 5 (sync) subscribes here to enqueue sync operations
 * without creating a direct dependency on the transactions feature.
 */
type TransactionEventType = 'upserted' | 'deleted'

type Listener = (txId: string, event: TransactionEventType) => void

const listeners = new Set<Listener>()

export const transactionEvents = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  emit(txId: string, event: TransactionEventType): void {
    for (const listener of listeners) {
      listener(txId, event)
    }
  },
}
