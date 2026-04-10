import { describe, it, expect, beforeEach } from 'vitest'
import { getToken, setToken, clear, hasToken, getExpiresAt } from './token-storage'

describe('token-storage', () => {
  beforeEach(() => {
    clear()
  })

  it('starts with no token', () => {
    expect(getToken()).toBeNull()
    expect(hasToken()).toBe(false)
  })

  it('stores and retrieves a token', () => {
    setToken('abc123', 3600)
    expect(getToken()).toBe('abc123')
    expect(hasToken()).toBe(true)
  })

  it('stores expiresAt as a future timestamp', () => {
    const before = Date.now()
    setToken('abc123', 3600)
    const after = Date.now()

    const exp = getExpiresAt()
    const expectedMin = before + 3600 * 1000
    const expectedMax = after + 3600 * 1000

    expect(exp).toBeGreaterThanOrEqual(expectedMin)
    expect(exp).toBeLessThanOrEqual(expectedMax)
  })

  it('persists expiresAt to sessionStorage', () => {
    setToken('abc123', 3600)
    const stored = sessionStorage.getItem('pfa_token_expires_at')
    expect(stored).not.toBeNull()
    expect(Number(stored)).toBeGreaterThan(0)
  })

  it('clears token and sessionStorage', () => {
    setToken('abc123', 3600)
    clear()
    expect(getToken()).toBeNull()
    expect(hasToken()).toBe(false)
    expect(getExpiresAt()).toBe(0)
    expect(sessionStorage.getItem('pfa_token_expires_at')).toBeNull()
  })

  it('never stores the actual token in sessionStorage', () => {
    setToken('secret-token-value', 3600)
    // Only expiresAt should be in sessionStorage, not the token itself
    const allKeys = Object.keys(sessionStorage)
    for (const key of allKeys) {
      expect(sessionStorage.getItem(key)).not.toBe('secret-token-value')
    }
  })

  it('overwrites previous token on set', () => {
    setToken('first', 3600)
    setToken('second', 1800)
    expect(getToken()).toBe('second')
  })
})
