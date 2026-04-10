import { useState } from 'react'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { chartTheme } from '@/features/reports/lib/chart-theme'

export interface CategoryDonutProps {
  data: Record<string, number>
  title: string
}

export function CategoryDonut({ data, title }: CategoryDonutProps) {
  const [showTable, setShowTable] = useState(false)

  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (chartData.length === 0) {
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
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartTheme.colors[index % chartTheme.colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <CategoryTable data={chartData} />
      )}
    </div>
  )
}

interface CategoryTableProps {
  data: Array<{ name: string; value: number }>
}

function CategoryTable({ data }: CategoryTableProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-700">
          <th className="px-2 py-2 text-left font-semibold text-slate-900 dark:text-white">Category</th>
          <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-white">Amount</th>
          <th className="px-2 py-2 text-right font-semibold text-slate-900 dark:text-white">%</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.name} className="border-b border-slate-100 dark:border-slate-800">
            <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{item.name}</td>
            <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
              {(item.value / 100).toFixed(2)}
            </td>
            <td className="px-2 py-2 text-right text-slate-700 dark:text-slate-300">
              {((item.value / total) * 100).toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
