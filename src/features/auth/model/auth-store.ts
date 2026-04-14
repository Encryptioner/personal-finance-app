import { create } from 'zustand'
import { gisClient } from '../api/gis-client'
import * as tokenStorage from '../api/token-storage'
import { getTokenState } from './token-state-machine'
import { getDeviceId } from '../lib/device-id'
import { MESSAGES } from '@/shared/constants/messages'
import { isGoogleAuthConfigured, env } from '@/shared/config/env'

export type AuthStatus = 'idle' | 'signing-in' | 'authenticated' | 'error'

export interface UserProfile {
  email: string
  name: string
  picture: string
}

interface AuthState {
  status: AuthStatus
  profile: UserProfile | null
  error: string | null
  dismissed: boolean
}

interface AuthActions {
  /** Initialize GIS client and attempt silent re-auth on app load. */
  initialize(clientId: string): Promise<void>
  /** Interactive sign-in via popup consent. */
  signIn(): Promise<void>
  /** Silent re-auth — no popup. Used on app load. */
  silentSignIn(): Promise<void>
  /** Sign out: revoke token, clear all state. */
  signOut(): Promise<void>
  /**
   * Ensure a fresh token is available before Drive API calls.
   * Triggers silent renewal if token is in "expiring" state.
   * Throws if not authenticated.
   */
  ensureFreshToken(): Promise<string>
  /** Check if currently authenticated. */
  isAuthenticated(): boolean
  /** Dismiss the sign-in banner. */
  dismissBanner(): void
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  status: 'idle',
  profile: null,
  error: null,
  dismissed: false,

  async initialize(clientId) {
    try {
      await gisClient.init({
        clientId,
        scope: 'https://www.googleapis.com/auth/drive.appdata',
      })

      // Try silent re-auth — restores session without UI
      await get().silentSignIn()
    } catch {
      // Script load failure (ad blocker, network issue)
      // Show error so user knows why sign-in won't work
      set({ status: 'error', error: MESSAGES.auth.scriptsBlocked })
    }
  },

  async signIn() {
    if (!isGoogleAuthConfigured() || !env.googleClientId) {
      set({ status: 'error', error: MESSAGES.auth.notConfigured })
      return
    }
    set({ status: 'signing-in', error: null })
    try {
      const response = await gisClient.requestAccessToken()
      if (!response) {
        const oauthError = gisClient.getLastError()
        if (oauthError === 'popup_closed_by_user') {
          // User closed the popup — not an error, return to idle
          set({ status: 'idle' })
        } else {
          set({ status: 'idle', error: MESSAGES.auth.signInFailed })
        }
        return
      }

      tokenStorage.setToken(response.accessToken, response.expiresIn)

      // Fetch user profile from Google
      const profile = await fetchUserProfile(response.accessToken)

      set({
        status: 'authenticated',
        profile,
        error: null,
      })
    } catch {
      set({ status: 'error', error: MESSAGES.auth.signInFailed })
    }
  },

  async silentSignIn() {
    try {
      const response = await gisClient.requestSilentToken()
      if (!response) {
        // User not signed in to Google or never consented before — normal
        set({ status: 'idle' })
        return
      }

      tokenStorage.setToken(response.accessToken, response.expiresIn)
      const profile = await fetchUserProfile(response.accessToken)

      set({
        status: 'authenticated',
        profile,
        error: null,
      })
    } catch {
      // Silent re-auth failure — don't show error to user
      set({ status: 'idle' })
    }
  },

  async signOut() {
    const token = tokenStorage.getToken()
    if (token) {
      try {
        await gisClient.revoke(token)
      } catch {
        // Revoke failure — still clear local state
      }
    }

    tokenStorage.clear()
    set({
      status: 'idle',
      profile: null,
      error: null,
    })
  },

  async ensureFreshToken(): Promise<string> {
    const token = tokenStorage.getToken()
    if (!token) {
      throw new Error(MESSAGES.auth.signInRequired)
    }

    const state = getTokenState({
      now: Date.now(),
      expiresAt: tokenStorage.getExpiresAt(),
      hasToken: true,
    })

    if (state === 'expired') {
      // Try silent renewal
      await get().silentSignIn()
      const newToken = tokenStorage.getToken()
      if (!newToken) {
        throw new Error(MESSAGES.auth.tokenExpired)
      }
      return newToken
    }

    if (state === 'expiring') {
      // Fire-and-forget silent renewal — current token still valid for a few minutes
      void get().silentSignIn()
    }

    return token
  },

  isAuthenticated() {
    return get().status === 'authenticated'
  },

  dismissBanner() {
    set({ dismissed: true })
  },
}))

/**
 * Fetch basic user profile from Google's userinfo endpoint.
 */
async function fetchUserProfile(accessToken: string): Promise<UserProfile> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  const data = await response.json() as {
    email: string
    name: string
    picture: string
  }

  return {
    email: data.email,
    name: data.name,
    picture: data.picture,
  }
}

/**
 * Get the device ID (async, from IndexedDB).
 * Convenience export for components that need it.
 */
export { getDeviceId }
