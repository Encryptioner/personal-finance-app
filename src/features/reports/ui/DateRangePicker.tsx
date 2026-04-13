import { useState, useEffect, useRef } from 'react'
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

const FOCUS_VISIBLE = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded'

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(value.from)
  const [customTo, setCustomTo] = useState(value.to)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on Escape and outside click
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false)
    }

    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Date range: ${value.from} to ${value.to}`}
        className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 ${FOCUS_VISIBLE}`}
      >
        {value.from} to {value.to}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-10 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg"
          role="dialog"
          aria-label="Select date range"
        >
          <div className="space-y-2 p-4">
            <p className="text-sm font-semibold text-foreground">
              Quick presets
            </p>
            <div className="grid gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.fn)}
                  className={`rounded px-2 py-1 text-left text-sm text-foreground hover:bg-muted/50 ${FOCUS_VISIBLE}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-semibold text-foreground">
                Custom range
              </p>
              <div className="space-y-2">
                <div>
                  <label htmlFor="custom-from" className="sr-only">From date</label>
                  <input
                    id="custom-from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full rounded border border-border bg-card px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label htmlFor="custom-to" className="sr-only">To date</label>
                  <input
                    id="custom-to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full rounded border border-border bg-card px-2 py-1 text-sm text-foreground"
                  />
                </div>
                <button
                  onClick={handleCustom}
                  disabled={!customFrom || !customTo || customFrom > customTo}
                  className={`w-full rounded bg-primary px-2 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 ${FOCUS_VISIBLE}`}
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
