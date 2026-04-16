/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from './auth-store'
import * as tokenStorage from '../api/token-storage'

// Mock gis-client
vi.mock('../api/gis-client', () => ({
  gisClient: {
    init: vi.fn().mockResolvedValue(undefined),
    requestAccessToken: vi.fn().mockResolvedValue(null),
    requestSilentToken: vi.fn().mockResolvedValue(null),
    revoke: vi.fn().mockResolvedValue(undefined),
    getLastError: vi.fn().mockReturnValue(null),
  },
}))

// Mock token-storage
vi.mock('../api/token-storage', () => ({
  getToken: vi.fn().mockReturnValue(null),
  setToken: vi.fn(),
  clear: vi.fn(),
  hasToken: vi.fn().mockReturnValue(false),
  getExpiresAt: vi.fn().mockReturnValue(0),
}))

// Mock fetch for user profile
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock device-id
vi.mock('../lib/device-id', () => ({
  getDeviceId: vi.fn().mockResolvedValue('device-123'),
}))

// Mock env config so signIn passes the isGoogleAuthConfigured() check
vi.mock('@/shared/config/env', () => ({
  env: { googleClientId: 'test-client-id' },
  isGoogleAuthConfigured: () => true,
}))

describe('auth-store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAuthStore.setState({
      status: 'idle',
      profile: null,
      error: null,
      dismissed: false,
    })
  })

  describe('signIn', () => {
    it('sets status to signing-in then authenticated on success', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.requestAccessToken).mockResolvedValue({
        accessToken: 'test-token',
        expiresIn: 3600,
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com', name: 'Test User', picture: 'https://pic.url' }),
      })

      const store = useAuthStore.getState()
      await store.signIn()

      expect(useAuthStore.getState().status).toBe('authenticated')
      expect(useAuthStore.getState().profile).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://pic.url',
      })
      expect(tokenStorage.setToken).toHaveBeenCalledWith('test-token', 3600)
    })

    it('sets error when user cancels sign-in', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.requestAccessToken).mockResolvedValue(null)

      const store = useAuthStore.getState()
      await store.signIn()

      expect(useAuthStore.getState().status).toBe('idle')
      expect(useAuthStore.getState().error).toBeTruthy()
    })

    it('returns to idle without error when popup is closed by user', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.requestAccessToken).mockResolvedValue(null)
      vi.mocked(gisClient.getLastError).mockReturnValue('popup_closed_by_user')

      const store = useAuthStore.getState()
      await store.signIn()

      expect(useAuthStore.getState().status).toBe('idle')
      expect(useAuthStore.getState().error).toBeNull()
    })

    it('sets error on unexpected failure', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.requestAccessToken).mockRejectedValue(new Error('Network error'))

      const store = useAuthStore.getState()
      await store.signIn()

      expect(useAuthStore.getState().status).toBe('error')
    })
  })

  describe('silentSignIn', () => {
    it('authenticates silently when Google session exists', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.requestSilentToken).mockResolvedValue({
        accessToken: 'silent-token',
        expiresIn: 3600,
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com', name: 'Test', picture: '' }),
      })

      const store = useAuthStore.getState()
      await store.silentSignIn()

      expect(useAuthStore.getState().status).toBe('authenticated')
    })

    it('stays idle when no Google session', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.requestSilentToken).mockResolvedValue(null)

      const store = useAuthStore.getState()
      await store.silentSignIn()

      expect(useAuthStore.getState().status).toBe('idle')
    })

    it('stays idle on silent re-auth failure', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.requestSilentToken).mockRejectedValue(new Error('Failed'))

      const store = useAuthStore.getState()
      await store.silentSignIn()

      expect(useAuthStore.getState().status).toBe('idle')
    })
  })

  describe('signOut', () => {
    it('revokes token and clears state', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(tokenStorage.getToken).mockReturnValue('existing-token')

      useAuthStore.setState({ status: 'authenticated', profile: { email: 'a@b.com', name: 'A', picture: '' } })

      const store = useAuthStore.getState()
      await store.signOut()

      expect(gisClient.revoke).toHaveBeenCalledWith('existing-token')
      expect(tokenStorage.clear).toHaveBeenCalled()
      expect(useAuthStore.getState().status).toBe('idle')
      expect(useAuthStore.getState().profile).toBeNull()
    })

    it('clears state even when revoke fails', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(tokenStorage.getToken).mockReturnValue('token')
      vi.mocked(gisClient.revoke).mockRejectedValue(new Error('Revoke failed'))

      useAuthStore.setState({ status: 'authenticated' })

      const store = useAuthStore.getState()
      await store.signOut()

      expect(useAuthStore.getState().status).toBe('idle')
      expect(tokenStorage.clear).toHaveBeenCalled()
    })
  })

  describe('ensureFreshToken', () => {
    it('returns token when valid', async () => {
      vi.mocked(tokenStorage.getToken).mockReturnValue('valid-token')
      vi.mocked(tokenStorage.getExpiresAt).mockReturnValue(Date.now() + 60 * 60 * 1000)

      const store = useAuthStore.getState()
      const token = await store.ensureFreshToken()
      expect(token).toBe('valid-token')
    })

    it('throws when not authenticated', async () => {
      vi.mocked(tokenStorage.getToken).mockReturnValue(null)

      const store = useAuthStore.getState()
      await expect(store.ensureFreshToken()).rejects.toThrow()
    })
  })

  describe('isAuthenticated', () => {
    it('returns true when status is authenticated', () => {
      useAuthStore.setState({ status: 'authenticated' })
      const store = useAuthStore.getState()
      expect(store.isAuthenticated()).toBe(true)
    })

    it('returns false when status is idle', () => {
      useAuthStore.setState({ status: 'idle' })
      const store = useAuthStore.getState()
      expect(store.isAuthenticated()).toBe(false)
    })
  })

  describe('dismissBanner', () => {
    it('sets dismissed to true', () => {
      useAuthStore.setState({ dismissed: false })
      useAuthStore.getState().dismissBanner()
      expect(useAuthStore.getState().dismissed).toBe(true)
    })
  })

  describe('initialize', () => {
    it('calls silentSignIn after gis init succeeds', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.init).mockResolvedValue(undefined)
      vi.mocked(gisClient.requestSilentToken).mockResolvedValue(null)

      await useAuthStore.getState().initialize('test-client-id')

      expect(gisClient.init).toHaveBeenCalledWith({
        clientId: 'test-client-id',
        scope: 'https://www.googleapis.com/auth/drive.appdata',
      })
    })

    it('sets error status when GIS script fails to load', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(gisClient.init).mockRejectedValue(new Error('Script blocked'))

      await useAuthStore.getState().initialize('test-client-id')

      expect(useAuthStore.getState().status).toBe('error')
      expect(useAuthStore.getState().error).toBeTruthy()
    })
  })

  describe('ensureFreshToken - expiring', () => {
    it('fires silent renew but returns current token when expiring', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(tokenStorage.getToken).mockReturnValue('expiring-token')
      // Token expires in 2 minutes — within the "expiring" window (< 5 min)
      vi.mocked(tokenStorage.getExpiresAt).mockReturnValue(Date.now() + 2 * 60 * 1000)
      vi.mocked(gisClient.requestSilentToken).mockResolvedValue(null)

      const store = useAuthStore.getState()
      const token = await store.ensureFreshToken()

      expect(token).toBe('expiring-token')
    })
  })

  describe('ensureFreshToken - expired', () => {
    it('throws when silent renewal fails to get new token', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(tokenStorage.getToken)
        .mockReturnValueOnce('old-token') // first call: has token
        .mockReturnValue(null) // after silent sign-in: no new token
      vi.mocked(tokenStorage.getExpiresAt).mockReturnValue(Date.now() - 1000) // expired
      vi.mocked(gisClient.requestSilentToken).mockResolvedValue(null)

      const store = useAuthStore.getState()
      await expect(store.ensureFreshToken()).rejects.toThrow()
    })
  })

  describe('signOut - no token', () => {
    it('clears state without calling revoke when no token', async () => {
      const { gisClient } = await import('../api/gis-client')
      vi.mocked(tokenStorage.getToken).mockReturnValue(null)
      useAuthStore.setState({ status: 'authenticated' })

      await useAuthStore.getState().signOut()

      expect(gisClient.revoke).not.toHaveBeenCalled()
      expect(useAuthStore.getState().status).toBe('idle')
    })
  })
})
