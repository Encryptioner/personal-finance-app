import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSyncStore } from './sync-store'

// Mock auth store
const mockIsAuthenticated = vi.fn().mockReturnValue(false)
const mockEnsureFreshToken = vi.fn().mockResolvedValue('test-token')

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => ({
      isAuthenticated: mockIsAuthenticated,
      ensureFreshToken: mockEnsureFreshToken,
    }),
  },
  getDeviceId: vi.fn().mockResolvedValue('device-123'),
}))

// Mock drive file manager
const mockFindOrCreate = vi.fn().mockResolvedValue('file-id-123')
vi.mock('../api/drive-file-manager', () => ({
  createDriveFileManager: vi.fn(() => ({
    findOrCreateTransactionsFile: mockFindOrCreate,
  })),
}))

// Mock sync service
const mockRunSync = vi.fn().mockResolvedValue({ ok: true, mergedCount: 5 })
vi.mock('../services/sync-service', () => ({
  createSyncService: vi.fn(() => ({
    runSync: mockRunSync,
  })),
}))

// Mock analytics
vi.mock('@/shared/lib/analytics-service', () => ({
  track: {
    syncStarted: vi.fn(),
    syncCompleted: vi.fn(),
    syncFailed: vi.fn(),
  },
}))

describe('sync-store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSyncStore.setState({ status: 'idle', lastSyncAt: null, fileId: null, error: null })
  })

  describe('reset()', () => {
    it('resets all state to initial values', () => {
      useSyncStore.setState({ status: 'error', lastSyncAt: '2026-01-01', fileId: 'abc', error: 'oops' })
      useSyncStore.getState().reset()
      const state = useSyncStore.getState()
      expect(state.status).toBe('idle')
      expect(state.lastSyncAt).toBeNull()
      expect(state.fileId).toBeNull()
      expect(state.error).toBeNull()
    })
  })

  describe('sync() - offline', () => {
    it('sets status to offline when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
      await useSyncStore.getState().sync()
      expect(useSyncStore.getState().status).toBe('offline')
    })
  })

  describe('sync() - not authenticated', () => {
    it('returns early without changing status when not authenticated', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
      mockIsAuthenticated.mockReturnValue(false)
      await useSyncStore.getState().sync()
      expect(useSyncStore.getState().status).toBe('idle')
    })
  })

  describe('sync() - authenticated and online', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
      mockIsAuthenticated.mockReturnValue(true)
    })

    it('sets status to idle and updates lastSyncAt on success', async () => {
      mockRunSync.mockResolvedValue({ ok: true, mergedCount: 3 })
      await useSyncStore.getState().sync()
      const state = useSyncStore.getState()
      expect(state.status).toBe('idle')
      expect(state.lastSyncAt).not.toBeNull()
      expect(state.error).toBeNull()
    })

    it('caches fileId after first sync', async () => {
      await useSyncStore.getState().sync()
      expect(useSyncStore.getState().fileId).toBe('file-id-123')
    })

    it('reuses cached fileId on subsequent syncs', async () => {
      useSyncStore.setState({ fileId: 'cached-id' })
      await useSyncStore.getState().sync()
      expect(mockFindOrCreate).not.toHaveBeenCalled()
    })

    it('sets status to error when sync fails', async () => {
      mockRunSync.mockResolvedValue({ ok: false, error: 'Merge conflict' })
      await useSyncStore.getState().sync()
      const state = useSyncStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).toBe('Merge conflict')
    })

    it('sets status to error on thrown exception', async () => {
      mockRunSync.mockRejectedValue(new Error('Network failure'))
      await useSyncStore.getState().sync()
      const state = useSyncStore.getState()
      expect(state.status).toBe('error')
      expect(state.error).toBe('Network failure')
    })

    it('sets generic error message for non-Error exceptions', async () => {
      mockRunSync.mockRejectedValue('some string error')
      await useSyncStore.getState().sync()
      expect(useSyncStore.getState().error).toBe('Sync failed')
    })
  })

  describe('runOnLoad()', () => {
    it('runs sync when online and authenticated', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
      mockIsAuthenticated.mockReturnValue(true)
      mockRunSync.mockResolvedValue({ ok: true, mergedCount: 0 })
      await useSyncStore.getState().runOnLoad()
      expect(useSyncStore.getState().status).toBe('idle')
    })

    it('does nothing when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
      mockIsAuthenticated.mockReturnValue(true)
      await useSyncStore.getState().runOnLoad()
      // Stays idle, no sync attempt
      expect(useSyncStore.getState().status).toBe('idle')
    })

    it('does nothing when not authenticated', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
      mockIsAuthenticated.mockReturnValue(false)
      await useSyncStore.getState().runOnLoad()
      expect(useSyncStore.getState().status).toBe('idle')
    })
  })
})
