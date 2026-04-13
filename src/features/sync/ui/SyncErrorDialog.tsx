import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SyncErrorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error: string | null
  onRetry: () => void
}

/**
 * Dialog showing sync error details with retry and copy-to-clipboard.
 * Per spec §9.5: no external telemetry; "Copy error details" for bug reports.
 */
export function SyncErrorDialog({ open, onOpenChange, error, onRetry }: SyncErrorDialogProps) {
  function handleCopy() {
    const details = `Sync error at ${new Date().toISOString()}:\n${error ?? 'Unknown error'}`
    void navigator.clipboard.writeText(details)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync failed</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <DialogDescription className="text-sm text-muted-foreground">
            {error ?? 'An unknown error occurred while syncing.'}
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              Copy error details
            </Button>
            <Button size="sm" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
