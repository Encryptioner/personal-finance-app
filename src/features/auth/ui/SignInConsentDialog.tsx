import { ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MESSAGES } from '@/shared/constants/messages'

interface SignInConsentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function SignInConsentDialog({ open, onOpenChange, onConfirm }: SignInConsentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {MESSAGES.consent.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Information about data access and the Google sign-in process
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-muted-foreground">
          <p>{MESSAGES.consent.dataAccess}</p>

          <div className="rounded-md border border-border bg-muted/50 p-3">
            <p className="font-medium text-foreground mb-2">
              {MESSAGES.consent.unverifiedWarning}
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{MESSAGES.consent.unverifiedStep1}</li>
              <li>{MESSAGES.consent.unverifiedStep2}</li>
            </ol>
          </div>

          <p>{MESSAGES.consent.dataOwnership}</p>

          <p>{MESSAGES.consent.privacy}</p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {MESSAGES.consent.cancelButton}
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false)
              onConfirm()
            }}
          >
            {MESSAGES.consent.continueButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
