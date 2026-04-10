import { describe, it, expect } from 'vitest'
import { getTokenState } from './token-state-machine'
import type { TokenStateInput } from './token-state-machine'

/** Helper to build TokenStateInput with defaults. */
function input(overrides: Partial<TokenStateInput> = {}): TokenStateInput {
  return {
    now: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    hasToken: true,
    ...overrides,
  }
}

describe('getTokenState', () => {
  it('returns "unauthenticated" when there is no token', () => {
    expect(getTokenState(input({ hasToken: false }))).toBe('unauthenticated')
  })

  it('returns "unauthenticated" when expiresAt is 0', () => {
    expect(getTokenState(input({ expiresAt: 0 }))).toBe('unauthenticated')
  })

  it('returns "valid" when token expires in > 5 minutes', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now + 6 * 60 * 1000 }))).toBe('valid')
  })

  it('returns "valid" when token expires in exactly 5 minutes + 1ms', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now + 5 * 60 * 1000 + 1 }))).toBe('valid')
  })

  it('returns "expiring" when token expires in exactly 5 minutes', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now + 5 * 60 * 1000 }))).toBe('expiring')
  })

  it('returns "expiring" when token expires in 1 second', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now + 1000 }))).toBe('expiring')
  })

  it('returns "expiring" when token expires in 1ms', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now + 1 }))).toBe('expiring')
  })

  it('returns "expired" when token is exactly at expiry time', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now }))).toBe('expired')
  })

  it('returns "expired" when token expired in the past', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now - 1 }))).toBe('expired')
  })

  it('returns "expired" when token expired an hour ago', () => {
    const now = Date.now()
    expect(getTokenState(input({ now, expiresAt: now - 60 * 60 * 1000 }))).toBe('expired')
  })
})
