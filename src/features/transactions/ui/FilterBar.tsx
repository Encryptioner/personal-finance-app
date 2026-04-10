import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { TransactionFilters } from '../api/transaction-repository'

interface FilterBarProps {
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  function update(patch: Partial<TransactionFilters>) {
    onChange({ ...filters, ...patch })
  }

  function clearFilters() {
    onChange({})
  }

  const hasFilters = !!(filters.type || filters.category || filters.dateFrom || filters.dateTo || filters.search)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        placeholder="Search..."
        value={filters.search ?? ''}
        onChange={(e) => update({ search: e.target.value || undefined })}
        className="h-10 sm:h-8 sm:w-40"
        aria-label="Search transactions"
      />

      <div className="flex gap-2">
        <Select
          value={filters.type ?? 'all'}
          onValueChange={(v) => update({ type: v === 'all' ? undefined : (v as TransactionFilters['type']) })}
        >
          <SelectTrigger className="h-10 sm:h-8 flex-1 sm:flex-none sm:w-32" aria-label="Filter by type">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10 sm:h-8 text-xs shrink-0">
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => update({ dateFrom: e.target.value || undefined })}
          className="h-10 sm:h-8 flex-1 sm:flex-none sm:w-36"
          aria-label="From date"
        />
        <span className="text-muted-foreground text-sm shrink-0">–</span>
        <Input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => update({ dateTo: e.target.value || undefined })}
          className="h-10 sm:h-8 flex-1 sm:flex-none sm:w-36"
          aria-label="To date"
        />
      </div>
    </div>
  )
}
