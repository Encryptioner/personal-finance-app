import { useMemo } from 'react'
import { useStore } from '@/shared/store/app-store'
import { summary } from '@/features/reports/model/aggregators'
import { thisMonth } from '@/features/reports/model/date-ranges'
import { formatCurrency } from '@/shared/lib/money'

/**
 * Condensed summary tile for the main dashboard.
 * Shows this month's income, expense, and net.
 */
export function DashboardTile() {
  const transactions = useStore((state) => state.transactions)
  const currency = useStore((state) => state.settings.currency)

  const stats = useMemo(() => {
    const range = thisMonth(new Date())
    return summary(transactions, range)
  }, [transactions])

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">This month</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-slate-600 dark:text-slate-400">Income</p>
          <p className="font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(stats.income, currency)}
          </p>
        </div>
        <div>
          <p className="text-slate-600 dark:text-slate-400">Expense</p>
          <p className="font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(stats.expense, currency)}
          </p>
        </div>
      </div>
      <div className="border-t border-slate-200 pt-2 dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-400">Net</p>
        <p className={`font-semibold ${stats.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {formatCurrency(stats.net, currency)}
        </p>
      </div>
    </div>
  )
}
