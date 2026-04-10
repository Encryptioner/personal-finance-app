import { useState } from 'react'
import type { DateRange } from '@/features/reports/model/date-ranges'
import {
  lastNDays,
  lastMonth,
  lastYear,
  thisMonth,
  thisYear,
} from '@/features/reports/model/date-ranges'

export interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS = [
  { label: 'Last 7 days', fn: (now: Date) => lastNDays(7, now) },
  { label: 'Last 30 days', fn: (now: Date) => lastNDays(30, now) },
  { label: 'This month', fn: thisMonth },
  { label: 'Last month', fn: lastMonth },
  { label: 'This year', fn: thisYear },
  { label: 'Last year', fn: lastYear },
]

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(value.from)
  const [customTo, setCustomTo] = useState(value.to)

  const handlePreset = (fn: (now: Date) => DateRange) => {
    const range = fn(new Date())
    onChange(range)
    setIsOpen(false)
  }

  const handleCustom = () => {
    if (customFrom && customTo && customFrom <= customTo) {
      onChange({ from: customFrom, to: customTo })
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        {value.from} to {value.to}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="space-y-2 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Quick presets
            </h3>
            <div className="grid gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.fn)}
                  className="rounded px-2 py-1 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                Custom range
              </h3>
              <div className="space-y-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <button
                  onClick={handleCustom}
                  disabled={!customFrom || !customTo || customFrom > customTo}
                  className="w-full rounded bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
