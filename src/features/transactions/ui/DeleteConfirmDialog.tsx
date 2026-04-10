import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/shared/types/transaction'

interface DeleteConfirmDialogProps {
  transaction: Transaction | null
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export function DeleteConfirmDialog({ transaction, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={transaction !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete transaction?</DialogTitle>
          <DialogDescription>
            This will remove the{' '}
            <strong>{transaction?.category}</strong> transaction. This action can be undone
            by syncing — the record is soft-deleted and kept until the 90-day tombstone GC.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={() => void onConfirm()}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
