import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onAdd: () => void
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <PlusCircle className="h-12 w-12 text-muted-foreground" />
      <div>
        <p className="text-lg font-medium">No transactions yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add your first transaction to get started.</p>
      </div>
      <Button onClick={onAdd}>Add transaction</Button>
    </div>
  )
}
