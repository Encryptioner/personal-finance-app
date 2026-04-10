import { Button } from '@/components/ui/button'
import type { MappingResult } from '../api/csv-column-mapper'

interface ImportPreviewStepProps {
  rowCount: number
  mapping: MappingResult
  dateFormat: string
  importing: boolean
  onConfirm: () => void
  onBack: () => void
}

export function ImportPreviewStep({
  rowCount,
  mapping,
  dateFormat,
  importing,
  onConfirm,
  onBack,
}: ImportPreviewStepProps) {
  const mapped = mapping.autoMapped
  const fieldLabels: Record<string, string> = {
    date: 'Date',
    amount: 'Amount',
    debitColumn: 'Debit',
    creditColumn: 'Credit',
    description: 'Description',
    category: 'Category',
    type: 'Type',
    tags: 'Tags',
  }

  const mappedEntries = Object.entries(mapped)
    .filter(([, val]) => val !== undefined)
    .map(([key, val]) => ({
      field: fieldLabels[key] ?? key,
      column: val as string,
    }))

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-4 space-y-3">
        <p className="text-sm font-medium">Import summary</p>

        <dl className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total rows</dt>
            <dd className="font-medium">{rowCount}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Date format</dt>
            <dd className="font-medium">{dateFormat.toUpperCase()}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-muted-foreground">Amount mode</dt>
            <dd className="font-medium">
              {mapping.amountMode === 'debitCredit' ? 'Debit / Credit columns' : 'Single amount column'}
            </dd>
          </div>
        </dl>

        {/* Mapped columns */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1.5">Mapped columns</p>
          <div className="flex flex-wrap gap-1.5">
            {mappedEntries.map(({ field, column }) => (
              <span
                key={field}
                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
              >
                <span className="font-medium">{field}</span>
                <span className="text-muted-foreground">←</span>
                <span>{column}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={importing}>
          Back
        </Button>
        <Button type="button" onClick={onConfirm} disabled={importing}>
          {importing ? 'Importing…' : `Import ${rowCount} transactions`}
        </Button>
      </div>
    </div>
  )
}
