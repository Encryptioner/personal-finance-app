import { useAuthStore } from '../model/auth-store'
import { MESSAGES } from '@/shared/constants/messages'
import { X } from 'lucide-react'

/**
 * Dismissible banner shown to unsigned users.
 * "Sign in with Google to sync across devices" + dismiss button.
 * Hidden when user is authenticated or has dismissed it.
 */
export function SignInBanner() {
  const status = useAuthStore((s) => s.status)
  const error = useAuthStore((s) => s.error)
  const dismissed = useAuthStore((s) => s.dismissed)

  if (status === 'authenticated' || dismissed) return null

  return (
    <div
      className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between gap-2"
      role="banner"
    >
      <p className="text-sm text-primary/80">
        {error || MESSAGES.auth.signInRequired}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void useAuthStore.getState().signIn()}
          className="text-sm font-medium text-primary hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => useAuthStore.getState().dismissBanner()}
          className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5"
          aria-label="Dismiss sign-in banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
