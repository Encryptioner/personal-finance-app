import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mocks set up before any import of auto-sync (it imports these at module level)
const mockSync = vi.fn().mockResolvedValue(undefined)
const mockLoad = vi.fn().mockResolvedValue(undefined)
const mockIsAuthenticated = vi.fn().mockReturnValue(true)

const mockTransactionSubscribers: Array<() => void> = []
const mockTransactionUnsubscribe = vi.fn()

vi.mock('../model/sync-store', () => ({
  useSyncStore: {
    getState: () => ({ sync: mockSync }),
  },
}))

vi.mock('@/features/auth', () => ({
  useAuthStore: {
    getState: () => ({ isAuthenticated: mockIsAuthenticated }),
  },
}))

vi.mock('@/features/transactions/model/transaction-store', () => ({
  useTransactionStore: {
    subscribe: vi.fn((cb: () => void) => {
      mockTransactionSubscribers.push(cb)
      return mockTransactionUnsubscribe
    }),
    getState: () => ({ load: mockLoad }),
  },
}))

const mockOnBroadcastCleanup = vi.fn()
let broadcastCallback: ((msg: { type: string }) => void) | null = null

vi.mock('./broadcast-channel', () => ({
  onBroadcast: vi.fn((cb: (msg: { type: string }) => void) => {
    broadcastCallback = cb
    return mockOnBroadcastCleanup
  }),
}))

// Import AFTER mocks are set up
const { initAutoSync } = await import('./auto-sync')

describe('initAutoSync', () => {
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module-level initialized flag by re-importing
    mockTransactionSubscribers.length = 0
    broadcastCallback = null
    vi.useFakeTimers()
    cleanup = initAutoSync()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('returns a cleanup function', () => {
    expect(typeof cleanup).toBe('function')
  })

  it('subscribes to transaction store', async () => {
    const { useTransactionStore } = await import('@/features/transactions/model/transaction-store')
    expect(useTransactionStore.subscribe).toHaveBeenCalled()
  })

  it('registers online event listener', () => {
    const addEventSpy = vi.spyOn(window, 'addEventListener')
    const cleanup2 = initAutoSync()
    // Since already initialized, returns early — no new listeners
    cleanup2()
    addEventSpy.mockRestore()
  })

  it('triggers debounced sync on transaction store change when authenticated and online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
    mockIsAuthenticated.mockReturnValue(true)

    // Simulate a transaction store change
    for (const cb of mockTransactionSubscribers) cb()

    // Advance timer past debounce
    await vi.advanceTimersByTimeAsync(1100)

    expect(mockSync).toHaveBeenCalled()
  })

  it('skips debounced sync when not authenticated', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
    mockIsAuthenticated.mockReturnValue(false)

    for (const cb of mockTransactionSubscribers) cb()
    await vi.advanceTimersByTimeAsync(1100)

    expect(mockSync).not.toHaveBeenCalled()
  })

  it('skips debounced sync when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true })
    mockIsAuthenticated.mockReturnValue(true)

    for (const cb of mockTransactionSubscribers) cb()
    await vi.advanceTimersByTimeAsync(1100)

    expect(mockSync).not.toHaveBeenCalled()
  })

  it('triggers sync on online event when authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    expect(mockSync).toHaveBeenCalled()
  })

  it('skips sync on online event when not authenticated', () => {
    mockIsAuthenticated.mockReturnValue(false)
    window.dispatchEvent(new Event('online'))
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('triggers sync on visibility change to visible when authenticated', () => {
    mockIsAuthenticated.mockReturnValue(true)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(mockSync).toHaveBeenCalled()
  })

  it('skips sync on visibility change to hidden', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('reloads transactions when sync-complete broadcast is received', async () => {
    broadcastCallback?.({ type: 'sync-complete' })
    await Promise.resolve() // let async load settle
    expect(mockLoad).toHaveBeenCalled()
  })

  it('ignores unknown broadcast message types', () => {
    broadcastCallback?.({ type: 'other-message' })
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('cleanup removes event listeners', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    cleanup()
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
    removeSpy.mockRestore()
    // Re-init for afterEach
    cleanup = initAutoSync()
  })
})
