import { create } from 'zustand'
import { createSyncService } from '../services/sync-service'
import { createDriveFileManager } from '../api/drive-file-manager'
import { useAuthStore, getDeviceId } from '@/features/auth'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncState {
  status: SyncStatus
  lastSyncAt: string | null
  fileId: string | null
  error: string | null
}

interface SyncActions {
  sync(): Promise<void>
  runOnLoad(): Promise<void>
  reset(): void
}

/**
 * Sync orchestration store.
 * Coordinates triggering syncs via Google Drive, manages sync status and error state.
 *
 * Key responsibilities:
 * - Create/cache Drive infrastructure (driveFileManager, fileId)
 * - Check auth + online status before attempting sync
 * - Update status and error fields for UI
 * - Call sync-service to execute the actual sync
 */
export const useSyncStore = create<SyncState & SyncActions>((set, get) => ({
  status: 'idle',
  lastSyncAt: null,
  fileId: null,
  error: null,

  async sync() {
    const authStore = useAuthStore.getState()

    // 1. Check online status
    if (!navigator.onLine) {
      set({ status: 'offline', error: null })
      return
    }

    // 2. Check authentication
    if (!authStore.isAuthenticated()) {
      return
    }

    // 3. Begin sync
    set({ status: 'syncing', error: null })

    try {
      // 4. Get fresh token
      const token = await authStore.ensureFreshToken()

      // 5. Create drive file manager
      const driveFileManager = createDriveFileManager(token)

      // 6. Find or create transactions file, cache the fileId
      let fileId = get().fileId
      if (!fileId) {
        fileId = await driveFileManager.findOrCreateTransactionsFile()
        set({ fileId })
      }

      // 7. Get device ID
      const deviceId = await getDeviceId()

      // 8. Create and run sync service
      const syncService = createSyncService(deviceId, driveFileManager)
      const result = await syncService.runSync(fileId)

      // 9. Update state
      if (result.ok) {
        set({
          status: 'idle',
          lastSyncAt: new Date().toISOString(),
          error: null,
        })
      } else {
        set({
          status: 'error',
          error: result.error ?? 'Sync failed',
        })
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sync failed'
      set({ status: 'error', error: message })
    }
  },

  async runOnLoad() {
    // Only sync on load if online and authenticated
    if (navigator.onLine && useAuthStore.getState().isAuthenticated()) {
      await get().sync()
    }
  },

  reset() {
    set({ status: 'idle', lastSyncAt: null, fileId: null, error: null })
  },
}))
