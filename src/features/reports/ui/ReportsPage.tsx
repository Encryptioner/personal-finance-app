import { useMemo, useState, Suspense, useEffect } from 'react'
import { useTransactionStore } from '@/features/transactions/model/transaction-store'
import type { DateRange } from '@/features/reports/model/date-ranges'
import { thisMonth } from '@/features/reports/model/date-ranges'
import { byCategory, byMonth, summary } from '@/features/reports/model/aggregators'
import { DateRangePicker } from './DateRangePicker'
import { StatsGrid } from './StatsGrid'
import { CategoryDonut } from './CategoryDonut'
import { MonthlyTrendChart } from './MonthlyTrendChart'
import { track } from '@/shared/lib/analytics-service'

/**
 * Full reports page with date range picker, aggregations, and charts.
 * Code-split via React.lazy() so Recharts only loads when this page is visited.
 */
export function ReportsPage() {
  const transactions = useTransactionStore((s) => s.transactions)
  const currency = 'USD'
  const [dateRange, setDateRange] = useState<DateRange>(thisMonth(new Date()))

  useEffect(() => {
    track.navigatedToReports()
  }, [])

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
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="mt-2 text-muted-foreground">
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
        <Suspense fallback={<div className="h-64 rounded-lg bg-muted/50 animate-pulse" />}>
          <CategoryDonut data={categoryBreakdown} title="Expense by category" />
        </Suspense>
        <Suspense fallback={<div className="h-64 rounded-lg bg-muted/50 animate-pulse" />}>
          <MonthlyTrendChart data={monthlyTrend} title="Monthly trend" />
        </Suspense>
      </div>

      {/* Transaction count */}
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Showing {stats.count} transaction{stats.count !== 1 ? 's' : ''} in the selected date range
        </p>
      </div>
    </div>
  )
}
