import { useMemo } from 'react'
import { useTransactionStore } from '@/features/transactions/model/transaction-store'
import { summary } from '@/features/reports/model/aggregators'
import { thisMonth } from '@/features/reports/model/date-ranges'
import { formatCurrency } from '@/shared/lib/money'

/**
 * Condensed summary tile for the main page.
 * Shows this month's income, expense, and net.
 */
export function DashboardTile() {
  const transactions = useTransactionStore((s) => s.transactions)
  const currency = 'USD'

  const stats = useMemo(() => {
    const range = thisMonth(new Date())
    const active = transactions.filter((tx) => !tx.deletedAt)
    return summary(active, range)
  }, [transactions])

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">This month</h2>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Income</p>
          <p className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(stats.income, currency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Expense</p>
          <p className="font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(stats.expense, currency)}
          </p>
        </div>
      </div>
      <div className="border-t border-border pt-2">
        <p className="text-muted-foreground">Net</p>
        <p className={`font-semibold ${stats.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {formatCurrency(stats.net, currency)}
        </p>
      </div>
    </div>
  )
}
