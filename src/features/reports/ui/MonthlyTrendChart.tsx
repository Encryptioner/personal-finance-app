import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { MonthSummary } from '@/features/reports/model/aggregators'
import { chartTheme } from '@/features/reports/lib/chart-theme'

export interface MonthlyTrendChartProps {
  data: MonthSummary[]
  title: string
}

const FOCUS_VISIBLE = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded'

export function MonthlyTrendChart({ data, title }: MonthlyTrendChartProps) {
  const [showTable, setShowTable] = useState(false)

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-center text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <button
          onClick={() => setShowTable(!showTable)}
          className={`text-sm text-primary hover:text-primary/80 ${FOCUS_VISIBLE}`}
        >
          {showTable ? 'View chart' : 'View as table'}
        </button>
      </div>

      {!showTable ? (
        <div
          className="h-80"
          role="img"
          aria-label={`${title} line chart. Switch to table view for accessible data.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid.stroke} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTheme.tooltip.backgroundColor,
                  border: chartTheme.tooltip.border,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke={chartTheme.colors[2]}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke={chartTheme.colors[1]}
                isAnimationActive={false}
              />
              <Line type="monotone" dataKey="net" stroke={chartTheme.colors[0]} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <MonthlyTable data={data} />
      )}
    </div>
  )
}

interface MonthlyTableProps {
  data: MonthSummary[]
}

function MonthlyTable({ data }: MonthlyTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="px-2 py-2 text-left font-semibold text-foreground">Month</th>
          <th className="px-2 py-2 text-right font-semibold text-foreground">Income</th>
          <th className="px-2 py-2 text-right font-semibold text-foreground">Expense</th>
          <th className="px-2 py-2 text-right font-semibold text-foreground">Net</th>
        </tr>
      </thead>
      <tbody>
        {data.map((month) => (
          <tr key={month.month} className="border-b border-border">
            <td className="px-2 py-2 text-foreground">{month.month}</td>
            <td className="px-2 py-2 text-right text-green-600 dark:text-green-400">
              {(month.income / 100).toFixed(2)}
            </td>
            <td className="px-2 py-2 text-right text-red-600 dark:text-red-400">
              {(month.expense / 100).toFixed(2)}
            </td>
            <td className="px-2 py-2 text-right text-primary">
              {(month.net / 100).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
