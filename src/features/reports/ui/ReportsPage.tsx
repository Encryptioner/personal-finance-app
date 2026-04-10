import { useMemo, useState } from 'react'
import { useStore } from '@/shared/store/app-store'
import type { DateRange } from '@/features/reports/model/date-ranges'
import { thisMonth } from '@/features/reports/model/date-ranges'
import { byCategory, byMonth, summary } from '@/features/reports/model/aggregators'
import { DateRangePicker } from './DateRangePicker'
import { StatsGrid } from './StatsGrid'
import { CategoryDonut } from './CategoryDonut'
import { MonthlyTrendChart } from './MonthlyTrendChart'

/**
 * Full reports page with date range picker, aggregations, and charts.
 * Code-split via React.lazy() so Recharts only loads when this page is visited.
 */
export function ReportsPage() {
  const transactions = useStore((state) => state.transactions)
  const currency = useStore((state) => state.settings.currency)
  const [dateRange, setDateRange] = useState<DateRange>(thisMonth(new Date()))

  // Filter transactions to date range and exclude tombstones
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => !tx.deletedAt && tx.date >= dateRange.from && tx.date <= dateRange.to)
  }, [transactions, dateRange])

  // Aggregations
  const stats = useMemo(() => summary(filteredTxs, dateRange), [filteredTxs, dateRange])
  const categoryBreakdown = useMemo(() => byCategory(filteredTxs, 'expense'), [filteredTxs])
  const monthlyTrend = useMemo(() => byMonth(transactions.filter((tx) => !tx.deletedAt)), [transactions])

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          View your transaction trends and category breakdown
        </p>
      </div>

      {/* Date range picker */}
      <div className="flex items-center gap-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Stats grid */}
      <StatsGrid stats={stats} currency={currency} />

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryDonut data={categoryBreakdown} title="Expense by category" />
        <MonthlyTrendChart data={monthlyTrend} title="Monthly trend" />
      </div>

      {/* Transaction count */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Showing {stats.count} transaction{stats.count !== 1 ? 's' : ''} in the selected date range
        </p>
      </div>
    </div>
  )
}
