const SESSION_KEY = 'pfa_token_expires_at'

/**
 * In-memory token storage with sessionStorage mirror for expiresAt.
 *
 * - Access token: module-level variable, cleared on page unload
 * - ExpiresAt: mirrored to sessionStorage so a same-tab reload can
 *   attempt silent re-auth without showing a popup
 *
 * NEVER stores the actual token in sessionStorage/localStorage.
 */

let accessToken: string | null = null
let expiresAt = 0

export function getToken(): string | null {
  return accessToken
}

export function getExpiresAt(): number {
  // Prefer in-memory; fall back to sessionStorage (survives hmr/reload in same tab)
  if (expiresAt > 0) return expiresAt
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (stored) {
    expiresAt = Number(stored)
    return expiresAt
  }
  return 0
}

export function setToken(token: string, expiresInSec: number): void {
  accessToken = token
  expiresAt = Date.now() + expiresInSec * 1000
  sessionStorage.setItem(SESSION_KEY, String(expiresAt))
}

export function clear(): void {
  accessToken = null
  expiresAt = 0
  sessionStorage.removeItem(SESSION_KEY)
}

export function hasToken(): boolean {
  return getToken() !== null
}
