/**
 * Auto-sync initialization.
 *
 * Wires up all sync triggers per spec §4.4:
 * 1. Mutation-driven sync (debounced 1s) when transaction store changes
 * 2. `online` event — drain queue immediately
 * 3. Visibility change — pull-check when tab becomes visible
 * 4. BroadcastChannel listener — reload data when another tab syncs
 *
 * Called once on app boot after authentication is confirmed.
 */

import { useSyncStore } from '../model/sync-store'
import { useAuthStore } from '@/features/auth'
import { onBroadcast } from './broadcast-channel'
import { useTransactionStore } from '@/features/transactions/model/transaction-store'

const SYNC_DEBOUNCE_MS = 1000

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let initialized = false

/**
 * Initialize auto-sync triggers.
 * Safe to call multiple times — only initializes once.
 */
export function initAutoSync(): () => void {
  if (initialized) return () => {}
  initialized = true

  const cleanups: Array<() => void> = []

  // Trigger 1: Mutation-driven sync (debounced)
  const unsub = useTransactionStore.subscribe(() => {
    if (!useAuthStore.getState().isAuthenticated()) return
    if (!navigator.onLine) return

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      void useSyncStore.getState().sync()
    }, SYNC_DEBOUNCE_MS)
  })
  cleanups.push(unsub)

  // Trigger 2: Online event — drain sync queue
  const handleOnline = () => {
    if (useAuthStore.getState().isAuthenticated()) {
      void useSyncStore.getState().sync()
    }
  }
  window.addEventListener('online', handleOnline)
  cleanups.push(() => window.removeEventListener('online', handleOnline))

  // Trigger 3: Visibility change — pull-check when tab becomes visible
  const handleVisibility = () => {
    if (
      document.visibilityState === 'visible' &&
      useAuthStore.getState().isAuthenticated()
    ) {
      void useSyncStore.getState().sync()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
  cleanups.push(() => document.removeEventListener('visibilitychange', handleVisibility))

  // Trigger 4: BroadcastChannel — reload data when another tab syncs
  const unsubBroadcast = onBroadcast((msg) => {
    if (msg.type === 'sync-complete') {
      void useTransactionStore.getState().load()
    }
  })
  cleanups.push(unsubBroadcast)

  return () => {
    for (const cleanup of cleanups) cleanup()
    if (debounceTimer) clearTimeout(debounceTimer)
    initialized = false
  }
}
