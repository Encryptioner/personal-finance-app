/** Type declarations for Google Identity Services (GIS) loaded via script tag. */

interface GisTokenClient {
  requestAccessToken(config: { prompt: string }): void
}

interface GisTokenResponse {
  error?: string
  access_token: string
  expires_in: string
}

interface Window {
  google: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string
          scope: string
          callback: (response: GisTokenResponse) => void
        }): GisTokenClient
        revoke(token: string, callback: () => void): void
      }
    }
  }
}
