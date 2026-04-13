import { useSyncStore, type SyncStatus } from '../model/sync-store'
import { useAuthStore } from '@/features/auth'
import { Cloud, CloudOff, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { SyncErrorDialog } from './SyncErrorDialog'

const STATUS_CONFIG: Record<SyncStatus, { label: string; icon: typeof Cloud; className: string }> = {
  idle: { label: 'Synced', icon: Cloud, className: 'text-muted-foreground' },
  syncing: { label: 'Syncing...', icon: Loader2, className: 'text-muted-foreground animate-spin' },
  error: { label: 'Sync failed', icon: AlertCircle, className: 'text-destructive' },
  offline: { label: 'Offline', icon: CloudOff, className: 'text-muted-foreground' },
}

function getAriaLabel(status: SyncStatus, isAuthenticated: boolean, timeAgo: string | null): string {
  if (!isAuthenticated) return 'Sign in to sync'
  if (status === 'syncing') return 'Syncing...'
  if (status === 'error') return 'Sync failed, tap for details'
  if (timeAgo) return `Synced, last synced ${timeAgo}`
  return 'Force sync'
}

/**
 * Sync button for the header.
 * Always visible — shows status and allows force-sync.
 * Disabled when not authenticated (with tooltip).
 */
export function SyncButton() {
  const status = useSyncStore((s) => s.status)
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt)
  const error = useSyncStore((s) => s.error)
  const isAuthenticated = useAuthStore((s) => s.status === 'authenticated')
  const [showError, setShowError] = useState(false)

  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const timeAgo = useTimeAgo(lastSyncAt)

  function handleClick() {
    if (status === 'error') {
      setShowError(true)
      return
    }
    void useSyncStore.getState().sync()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={!isAuthenticated || status === 'syncing'}
        aria-label={getAriaLabel(status, isAuthenticated, timeAgo)}
        className={`inline-flex items-center gap-1.5 text-sm font-medium rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${config.className} disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50`}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{config.label}</span>
        {status === 'error' && (
          <RefreshCw className="h-3 w-3 ml-0.5" />
        )}
      </button>

      {/* Live region for screen reader status announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {status === 'syncing' && 'Syncing in progress...'}
        {status === 'idle' && timeAgo && `Sync complete. Last synced ${timeAgo}.`}
        {status === 'error' && `Sync failed: ${error ?? 'Unknown error'}`}
        {status === 'offline' && 'You are offline. Sync is unavailable.'}
      </div>

      <SyncErrorDialog
        open={showError}
        onOpenChange={setShowError}
        error={error}
        onRetry={() => {
          setShowError(false)
          void useSyncStore.getState().sync()
        }}
      />
    </>
  )
}

/** Minimal "time ago" formatter for the sync button tooltip. */
function useTimeAgo(iso: string | null): string | null {
  if (!iso) return null

  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then

  if (diffMs < 60_000) return 'just now'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  return `${Math.floor(diffMs / 86_400_000)}d ago`
}
