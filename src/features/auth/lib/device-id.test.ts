import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('@/shared/db/db', () => ({
  db: {
    metadata: {
      get: mockGet,
      put: mockPut,
    },
  },
}))

vi.mock('@/shared/lib/id', () => ({
  generateId: vi.fn().mockReturnValue('generated-device-id-abc'),
}))

vi.mock('@/shared/types/settings', () => ({
  DEFAULT_SETTINGS: {
    currency: 'USD',
    locale: 'en-US',
    theme: 'system',
  },
}))

const { getDeviceId } = await import('./device-id')

describe('getDeviceId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing deviceId from IndexedDB when present', async () => {
    mockGet.mockResolvedValue({ key: 'settings', deviceId: 'existing-device-123' })
    const id = await getDeviceId()
    expect(id).toBe('existing-device-123')
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('creates and persists a new deviceId when none exists', async () => {
    mockGet.mockResolvedValue(null)
    const id = await getDeviceId()
    expect(id).toBe('generated-device-id-abc')
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'generated-device-id-abc' })
    )
  })

  it('creates new deviceId when metadata row has no deviceId', async () => {
    mockGet.mockResolvedValue({ key: 'settings' })
    const id = await getDeviceId()
    expect(id).toBe('generated-device-id-abc')
  })
})
