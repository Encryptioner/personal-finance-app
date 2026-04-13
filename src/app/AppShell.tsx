import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthShell } from '@/features/auth/ui/AuthShell'
import { useSyncStore } from '@/features/sync'
import { initAutoSync } from '@/features/sync/services/auto-sync'
import { UpdatePrompt } from '@/shared/ui/UpdatePrompt'

/**
 * Root app shell component.
 * - Initializes sync on app load
 * - Wires auto-sync triggers when authenticated
 * - Listens for online event to trigger sync when connectivity returns
 * - Renders UpdatePrompt for Service Worker updates
 * - Wraps AuthShell and routes (via Outlet)
 */
export function AppShell() {
  useEffect(() => {
    // Trigger sync on app load if online + authenticated
    void useSyncStore.getState().runOnLoad()

    // Initialize auto-sync triggers (debounce, visibility, broadcast)
    const cleanup = initAutoSync()

    // Listen for online event and trigger sync
    const handleOnline = () => void useSyncStore.getState().sync()
    window.addEventListener('online', handleOnline)

    return () => {
      cleanup()
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <AuthShell>
      <UpdatePrompt />
      <Outlet />
    </AuthShell>
  )
}
