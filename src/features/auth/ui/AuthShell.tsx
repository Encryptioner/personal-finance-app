import { useEffect, useRef } from 'react'
import { useAuthStore } from '../model/auth-store'
import { SignInBanner } from './SignInBanner'
import { ProfileMenu } from './ProfileMenu'
import { getDeviceId } from '../model/auth-store'
import { env, isGoogleAuthConfigured } from '@/shared/config/env'

/**
 * App shell that wraps the main content with header auth UI.
 * - Initializes GIS client and attempts silent re-auth on mount
 * - Shows SignInBanner when not authenticated
 * - Shows ProfileMenu when authenticated
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const initialized = useRef(false)

  // Initialize GIS client and generate device ID on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (isGoogleAuthConfigured() && env.googleClientId) {
      void useAuthStore.getState().initialize(env.googleClientId)
    }

    void getDeviceId()
  }, [])

  return (
    <>
      {status !== 'authenticated' && <SignInBanner />}
      {children}
    </>
  )
}

/**
 * Sign-in button for use in the header when user is not authenticated.
 */
export function HeaderAuthSection() {
  const status = useAuthStore((s) => s.status)
  const isSigningIn = status === 'signing-in'

  if (status === 'authenticated') {
    return <ProfileMenu />
  }

  return (
    <button
      type="button"
      disabled={isSigningIn}
      onClick={() => void useAuthStore.getState().signIn()}
      className="text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded disabled:opacity-50"
    >
      {isSigningIn ? 'Signing in...' : 'Sign in'}
    </button>
  )
}
