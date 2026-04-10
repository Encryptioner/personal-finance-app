import { useEffect, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTransactionStore, selectVisible } from '../model/transaction-store'
import { useShallow } from 'zustand/react/shallow'
import { TransactionRow } from './TransactionRow'
import { EmptyState } from './EmptyState'
import { FilterBar } from './FilterBar'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { TransactionForm } from './TransactionForm'
import { ImportWizard } from './ImportWizard'
import type { Transaction } from '@/shared/types/transaction'

const DEVICE_ID = 'local-device'
const LOCALE = 'en-US'

export function TransactionListPage() {
  const visible = useTransactionStore(useShallow(selectVisible))
  const filters = useTransactionStore((s) => s.filters)
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const { load, add, edit, remove, setFilters } = useTransactionStore.getState()
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd(input: Parameters<typeof add>[0]) {
    await add(input, DEVICE_ID)
    setAddOpen(false)
  }

  async function handleEdit(input: Parameters<typeof add>[0]) {
    if (!editTarget) return
    await edit(editTarget.id, input, DEVICE_ID)
    setEditTarget(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    await remove(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Transactions</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        <FilterBar filters={filters} onChange={setFilters} />

        {visible.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="hidden sm:table-cell px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="hidden sm:table-cell px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    locale={LOCALE}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm onSubmit={handleAdd} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit transaction</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <TransactionForm
              defaultValues={editTarget}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              currency={editTarget.currency}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        transaction={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import transactions</DialogTitle>
          </DialogHeader>
          <ImportWizard onComplete={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
