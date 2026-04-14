import { loadGoogleScripts } from '../lib/google-scripts-loader'

export interface TokenResponse {
  accessToken: string
  expiresIn: number // seconds until expiry
}

export interface GisClientConfig {
  clientId: string
  scope: string
}

/**
 * Thin wrapper around Google Identity Services (GIS) token client.
 * All methods are side-effectful I/O — tested via integration with mocked window.google.
 */
class GisClient {
  private tokenClient: GisTokenClient | null = null
  private pendingCallback: ((resp: TokenResponse | null) => void) | null = null
  private lastError: string | null = null

  /**
   * Initialize the GIS token client. Must be called after the GIS script loads.
   * The callback is invoked on every token response (user consent or silent re-auth).
   */
  async init(config: GisClientConfig): Promise<void> {
    await loadGoogleScripts()

    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: config.scope,
      callback: (response) => {
        if (this.pendingCallback) {
          if (response.error) {
            this.lastError = response.error
            this.pendingCallback(null)
          } else {
            this.pendingCallback({
              accessToken: response.access_token,
              expiresIn: Number(response.expires_in),
            })
          }
          this.pendingCallback = null
        }
      },
    })
  }

  /**
   * Request an access token with a popup consent flow.
   * Resolves with the token or null if the user cancels/errors.
   */
  requestAccessToken(): Promise<TokenResponse | null> {
    if (!this.tokenClient) {
      throw new Error('GIS client not initialized — call init() first')
    }
    return new Promise((resolve) => {
      this.pendingCallback = resolve
      this.tokenClient!.requestAccessToken({ prompt: 'consent' })
    })
  }

  /**
   * Attempt silent re-auth — no popup, no user interaction.
   * Resolves with the token or null if the user is not signed in to Google.
   */
  requestSilentToken(): Promise<TokenResponse | null> {
    if (!this.tokenClient) {
      throw new Error('GIS client not initialized — call init() first')
    }
    return new Promise((resolve) => {
      this.pendingCallback = resolve
      this.tokenClient!.requestAccessToken({ prompt: '' })
    })
  }

  /**
   * Get the last OAuth error code (e.g. 'popup_closed_by_user').
   * Returns null if the last request succeeded or no request was made.
   * Resets after reading.
   */
  getLastError(): string | null {
    const err = this.lastError
    this.lastError = null
    return err
  }

  /**
   * Revoke the given access token server-side.
   */
  revoke(token: string): Promise<void> {
    return new Promise((resolve) => {
      window.google.accounts.oauth2.revoke(token, () => {
        resolve()
      })
    })
  }
}

/** Singleton — shared across the app. */
export const gisClient = new GisClient()
