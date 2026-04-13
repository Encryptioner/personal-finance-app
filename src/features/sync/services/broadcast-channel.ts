/**
 * BroadcastChannel wrapper for cross-tab sync coordination.
 *
 * Messages:
 * - `sync-complete` — tells other tabs to reload data from IndexedDB
 * - `transaction-changed` — informs other tabs that local data changed
 *
 * Falls back silently when BroadcastChannel is unavailable (e.g., SSR, old browsers).
 */

type MessageType = 'sync-complete' | 'transaction-changed'

interface SyncMessage {
  type: MessageType
  at: string
  txId?: string
}

const CHANNEL_NAME = 'pfa-sync'

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (channel) return channel
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null
  channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

/** Post a message to other tabs. No-op if channel unavailable. */
export function broadcast(message: SyncMessage): void {
  const ch = getChannel()
  if (!ch) return
  try {
    ch.postMessage(message)
  } catch {
    // Channel closed or invalid — ignore
  }
}

/**
 * Subscribe to messages from other tabs.
 * Returns an unsubscribe function.
 */
export function onBroadcast(handler: (msg: SyncMessage) => void): () => void {
  const ch = getChannel()
  if (!ch) return () => {}

  const listener = (event: MessageEvent<SyncMessage>) => {
    handler(event.data)
  }

  ch.addEventListener('message', listener)
  return () => ch.removeEventListener('message', listener)
}
