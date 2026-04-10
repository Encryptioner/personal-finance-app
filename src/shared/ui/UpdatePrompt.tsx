import { useUpdatePrompt } from '@/sw-registration'
import { Button } from '@/components/ui/button'

/**
 * Service Worker update prompt banner.
 * Shows when a new version of the app is available and ready to activate.
 * User can click to reload and activate the new version.
 */
export function UpdatePrompt() {
  const { needsUpdate, updateApp } = useUpdatePrompt()

  if (!needsUpdate) return null

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 max-w-sm"
    >
      <p className="text-sm font-medium mb-3">New version available</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void updateApp()}
          className="w-full"
        >
          Reload to update
        </Button>
      </div>
    </div>
  )
}
