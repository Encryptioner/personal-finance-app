/** How far before expiry to start silent renewal. */
const RENEWAL_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export type TokenState = 'valid' | 'expiring' | 'expired' | 'unauthenticated'

export interface TokenStateInput {
  now: number
  expiresAt: number
  hasToken: boolean
}

/**
 * Pure function to determine the current token state.
 * Used by auth-store to decide whether to use the token, renew it, or re-auth.
 */
export function getTokenState({ now, expiresAt, hasToken }: TokenStateInput): TokenState {
  if (!hasToken || expiresAt === 0) return 'unauthenticated'

  const remaining = expiresAt - now

  if (remaining <= 0) return 'expired'
  if (remaining <= RENEWAL_THRESHOLD_MS) return 'expiring'
  return 'valid'
}
