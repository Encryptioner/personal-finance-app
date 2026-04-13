import type { SummaryStats } from '@/features/reports/model/aggregators'
import { formatCurrency } from '@/shared/lib/money'

export interface StatsGridProps {
  stats: SummaryStats
  currency: string
}

export function StatsGrid({ stats, currency }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Income"
        value={stats.income}
        currency={currency}
        className="text-green-600 dark:text-green-400"
      />
      <StatTile
        label="Expense"
        value={stats.expense}
        currency={currency}
        className="text-red-600 dark:text-red-400"
      />
      <StatTile label="Net" value={stats.net} currency={currency} className="text-primary" />
      <StatTile
        label="Avg Daily Spend"
        value={stats.avgDailySpend}
        currency={currency}
        className="text-muted-foreground"
      />
    </div>
  )
}

interface StatTileProps {
  label: string
  value: number
  currency: string
  className?: string
}

function StatTile({ label, value, currency, className = '' }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${className}`}>{formatCurrency(value, currency)}</p>
    </div>
  )
}
