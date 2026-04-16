import { describe, it, expect, vi, beforeEach } from 'vitest'
import { gisClient } from './gis-client'

interface MockTokenResponse {
  error?: string
  access_token: string
  expires_in: string
}

type TokenCallback = (resp: MockTokenResponse) => void

/** Create a mock GIS environment on window.google */
function mockGoogleApis() {
  let tokenCallback: TokenCallback | null = null

  const mockClient = {
    requestAccessToken: vi.fn((_config: { prompt: string }) => {
      if (tokenCallback) {
        queueMicrotask(() => {
          tokenCallback!({
            access_token: 'mock-access-token',
            expires_in: '3600',
          })
        })
      }
    }),
  }

  const mockGoogle: Pick<Window['google'], 'accounts'> = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config: { client_id: string; scope: string; callback: TokenCallback }) => {
          tokenCallback = config.callback
          return mockClient
        }),
        revoke: vi.fn((_token: string, cb: () => void) => {
          queueMicrotask(() => cb())
        }),
      },
    },
  }

  window.google = mockGoogle as Window['google']

  return { mockClient, mockGoogle }
}

describe('GisClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Clean up window.google
    delete (window as Partial<Window>).google
  })

  it('initializes the GIS token client', async () => {
    const { mockGoogle } = mockGoogleApis()

    await gisClient.init({
      clientId: 'test-client-id.apps.googleusercontent.com',
      scope: 'https://www.googleapis.com/auth/drive.appdata',
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const initTokenClient = mockGoogle.accounts.oauth2.initTokenClient
    expect(initTokenClient).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-client-id.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.appdata',
      }),
    )
  })

  it('requests access token with consent prompt', async () => {
    const { mockClient } = mockGoogleApis()

    await gisClient.init({
      clientId: 'test-client-id',
      scope: 'drive.appdata',
    })

    const result = await gisClient.requestAccessToken()

    expect(mockClient.requestAccessToken).toHaveBeenCalledWith({ prompt: 'consent' })
    expect(result).toEqual({
      accessToken: 'mock-access-token',
      expiresIn: 3600,
    })
  })

  it('requests silent token with empty prompt', async () => {
    const { mockClient } = mockGoogleApis()

    await gisClient.init({
      clientId: 'test-client-id',
      scope: 'drive.appdata',
    })

    const result = await gisClient.requestSilentToken()

    expect(mockClient.requestAccessToken).toHaveBeenCalledWith({ prompt: '' })
    expect(result).toEqual({
      accessToken: 'mock-access-token',
      expiresIn: 3600,
    })
  })

  it('returns null when GIS responds with error', async () => {
    let tokenCallback: TokenCallback | null = null

    const mockGoogle: Pick<Window['google'], 'accounts'> = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((config: { client_id: string; scope: string; callback: TokenCallback }) => {
            tokenCallback = config.callback
            return {
              requestAccessToken: vi.fn(() => {
                queueMicrotask(() => {
                  tokenCallback!({ error: 'popup_closed_by_user', access_token: '', expires_in: '' })
                })
              }),
            }
          }),
          revoke: vi.fn(),
        },
      },
    }

    window.google = mockGoogle as Window['google']

    await gisClient.init({ clientId: 'test', scope: 'drive.appdata' })
    const result = await gisClient.requestAccessToken()

    expect(result).toBeNull()
  })

  it('revokes token', async () => {
    const { mockGoogle } = mockGoogleApis()
    await gisClient.init({ clientId: 'test', scope: 'drive.appdata' })

    await gisClient.revoke('mock-access-token')

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const revoke = mockGoogle.accounts.oauth2.revoke
    expect(revoke).toHaveBeenCalledWith(
      'mock-access-token',
      expect.any(Function),
    )
  })

  it('throws if requestAccessToken called before init', async () => {
    vi.resetModules()
    const { gisClient: freshClient } = await import('./gis-client')
    expect(() => freshClient.requestAccessToken()).toThrow('GIS client not initialized')
  })

  it('throws if requestSilentToken called before init', async () => {
    vi.resetModules()
    const { gisClient: freshClient } = await import('./gis-client')
    expect(() => freshClient.requestSilentToken()).toThrow('GIS client not initialized')
  })

  it('getLastError returns the error code after an error response and clears it', async () => {
    let tokenCallback: TokenCallback | null = null

    const mockGoogle: Pick<Window['google'], 'accounts'> = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn((config: { client_id: string; scope: string; callback: TokenCallback }) => {
            tokenCallback = config.callback
            return {
              requestAccessToken: vi.fn(() => {
                queueMicrotask(() => {
                  tokenCallback!({ error: 'access_denied', access_token: '', expires_in: '' })
                })
              }),
            }
          }),
          revoke: vi.fn(),
        },
      },
    }

    window.google = mockGoogle as Window['google']

    vi.resetModules()
    const { gisClient: freshClient } = await import('./gis-client')
    await freshClient.init({ clientId: 'test', scope: 'drive.appdata' })
    await freshClient.requestAccessToken()

    const err = freshClient.getLastError()
    expect(err).toBe('access_denied')
    // Cleared after reading
    expect(freshClient.getLastError()).toBeNull()
  })
})
