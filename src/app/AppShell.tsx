import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthShell } from '@/features/auth/ui/AuthShell'
import { useSyncStore } from '@/features/sync'
import { UpdatePrompt } from '@/shared/ui/UpdatePrompt'

/**
 * Root app shell component.
 * - Initializes sync on app load
 * - Listens for online event to trigger sync when connectivity returns
 * - Renders UpdatePrompt for Service Worker updates
 * - Wraps AuthShell and routes (via Outlet)
 */
export function AppShell() {
  useEffect(() => {
    // Trigger sync on app load if online
    void useSyncStore.getState().runOnLoad()

    // Listen for online event and trigger sync
    const handleOnline = () => void useSyncStore.getState().sync()
    window.addEventListener('online', handleOnline)

    return () => window.removeEventListener('online', handleOnline)
  }, [])

  return (
    <AuthShell>
      <UpdatePrompt />
      <Outlet />
    </AuthShell>
  )
}
