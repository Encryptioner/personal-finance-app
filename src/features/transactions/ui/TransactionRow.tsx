import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/shared/lib/money'
import { formatDate } from '@/shared/lib/date'
import { cn } from '@/shared/lib/utils'
import type { Transaction } from '@/shared/types/transaction'

interface TransactionRowProps {
  transaction: Transaction
  locale: string
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

const typeColor: Record<string, string> = {
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-transfer',
}

const amountPrefix: Record<string, string> = {
  expense: '−',
  income: '+',
  transfer: '',
}

export function TransactionRow({ transaction: tx, locale, onEdit, onDelete }: TransactionRowProps) {
  return (
    <tr className="border-b border-border hover:bg-muted/40 transition-colors">
      {/* Date — hidden on mobile */}
      <td className="hidden sm:table-cell px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(tx.date, locale)}
      </td>
      <td className="px-4 py-3 text-sm">
        <span className="font-medium">{tx.category}</span>
        {/* Date shown inline on mobile */}
        <span className="block sm:hidden text-xs text-muted-foreground mt-0.5">
          {formatDate(tx.date, locale)}
          {tx.description && ` · ${tx.description}`}
        </span>
        {tx.description && (
          <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[200px]">{tx.description}</span>
        )}
      </td>
      {/* Type — hidden on mobile */}
      <td className="hidden sm:table-cell px-4 py-3 text-sm">
        <span className={cn('capitalize text-xs font-medium px-1.5 py-0.5 rounded', typeColor[tx.type])}>
          {tx.type}
        </span>
      </td>
      <td className={cn('px-4 py-3 text-sm font-semibold text-right whitespace-nowrap', typeColor[tx.type])}>
        {amountPrefix[tx.type]}{formatCurrency(tx.amount, tx.currency, locale)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${tx.category} transaction`}
            onClick={() => onEdit(tx)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${tx.category} transaction`}
            onClick={() => onDelete(tx)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
