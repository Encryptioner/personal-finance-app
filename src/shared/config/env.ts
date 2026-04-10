/**
 * Typed wrapper around Vite's import.meta.env.
 * Only VITE_* prefixed vars are exposed to client code.
 */
export const env = {
  /** Google OAuth 2.0 Client ID for GIS token flow. */
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined,
} as const

/**
 * Check if the Google Client ID is configured.
 * Returns true if it's set and non-empty.
 */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(env.googleClientId && env.googleClientId.length > 0)
}
