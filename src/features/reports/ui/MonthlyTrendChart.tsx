import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { MonthSummary } from '@/features/reports/model/aggregators'
import { chartTheme } from '@/features/reports/lib/chart-theme'

export interface MonthlyTrendChartProps {
  data: MonthSummary[]
  title: string
}

export function MonthlyTrendChart({ data, title }: MonthlyTrendChartProps) {
  const [showTable, setShowTable] = useState(false)

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-center text-slate-500 dark:text-slate-400">No data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <button
          onClick={() => setShowTable(!showTable)}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {showTable ? 'View chart' : 'View as table'}
        </button>
      </div>

      {!showTable ? (
        <div className="h-80">
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
        <tr className="border-b border-slate-200 dark:border-slate-700">
          <th className="px-2 py-2 text-left font-semibold text-slate-900 dark:text-white">Month</th>
          <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-white">Income</th>
          <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-white">Expense</th>
          <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-white">Net</th>
        </tr>
      </thead>
      <tbody>
        {data.map((month) => (
          <tr key={month.month} className="border-b border-slate-100 dark:border-slate-800">
            <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{month.month}</td>
            <td className="px-2 py-2 text-right text-green-600 dark:text-green-400">
              {(month.income / 100).toFixed(2)}
            </td>
            <td className="px-2 py-2 text-right text-red-600 dark:text-red-400">
              {(month.expense / 100).toFixed(2)}
            </td>
            <td className="px-2 py-2 text-right text-blue-600 dark:text-blue-400">
              {(month.net / 100).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
