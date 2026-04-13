import { useReducer, useCallback, useRef } from 'react'
import { parseCsv, type ParsedCsv } from '../api/csv-parser'
import {
  mapColumns,
  deriveAmount,
  type ColumnMapping,
  type MappingResult,
} from '../api/csv-column-mapper'
import { detectDateFormat } from '../lib/date-format-detection'
import { Button } from '@/components/ui/button'
import { ColumnMappingStep } from './ColumnMappingStep'
import { ImportPreviewStep } from './ImportPreviewStep'
import { track } from '@/shared/lib/analytics-service'
import type { TransactionInput } from '@/shared/types/transaction'

/* ------------------------------------------------------------------ */
/*  State machine                                                      */
/* ------------------------------------------------------------------ */

interface UploadStep {
  type: 'upload'
  error: string | null
}

interface MappingStep {
  type: 'mapping'
  csv: ParsedCsv
  mapping: MappingResult
  dateFormat: string
}

interface ConfirmStep {
  type: 'confirm'
  csv: ParsedCsv
  mapping: MappingResult
  dateFormat: string
  importing: boolean
}

interface DoneStep {
  type: 'done'
  imported: number
  skipped: number
}

type StepState = UploadStep | MappingStep | ConfirmStep | DoneStep

type Action =
  | { type: 'FILE_LOADED'; csv: ParsedCsv }
  | { type: 'FILE_ERROR'; message: string }
  | {
      type: 'MAPPING_CONFIRMED'
      mapping: MappingResult
      dateFormat: string
    }
  | { type: 'IMPORT_COMPLETE'; imported: number; skipped: number }
  | { type: 'SET_IMPORTING' }
  | { type: 'RESET' }

function reducer(state: StepState, action: Action): StepState {
  switch (action.type) {
    case 'FILE_LOADED': {
      const mapping = mapColumns(action.csv.headers)
      const dates = action.csv.rows.slice(0, 50).map((r) => {
        const dateVal = mapping.autoMapped.date ? r[mapping.autoMapped.date] ?? '' : ''
        return dateVal.trim()
      }).filter(Boolean)
      const dateFormat = detectDateFormat(dates)
      return {
        type: 'mapping',
        csv: action.csv,
        mapping,
        dateFormat: dateFormat === 'ambiguous' ? 'iso' : dateFormat,
      }
    }
    case 'FILE_ERROR':
      return { type: 'upload', error: action.message }
    case 'MAPPING_CONFIRMED':
      if (state.type !== 'mapping') return state
      return {
        type: 'confirm',
        csv: state.csv,
        mapping: action.mapping,
        dateFormat: action.dateFormat,
        importing: false,
      }
    case 'SET_IMPORTING':
      if (state.type !== 'confirm') return state
      return { ...state, importing: true }
    case 'IMPORT_COMPLETE':
      return { type: 'done', imported: action.imported, skipped: action.skipped }
    case 'RESET':
      return { type: 'upload', error: null }
    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/*  Date parsing                                                       */
/* ------------------------------------------------------------------ */

function parseDate(raw: string, format: string): string {
  const s = raw.trim()
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  if (format === 'us') {
    // MM/DD/YYYY → YYYY-MM-DD
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
    if (m) return `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`
  }

  if (format === 'eu') {
    // DD/MM/YYYY or DD.MM.YYYY → YYYY-MM-DD
    const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/)
    if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  }

  // Fallback: try native parse
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)

  return s // let validation catch it
}

/* ------------------------------------------------------------------ */
/*  Row → TransactionInput converter                                   */
/* ------------------------------------------------------------------ */

function rowToInput(
  row: Record<string, string>,
  mapping: ColumnMapping,
  dateFormat: string,
): TransactionInput | null {
  if (!mapping.date) return null
  const rawDate = row[mapping.date]?.trim()
  if (!rawDate) return null

  const date = parseDate(rawDate, dateFormat)
  const amount = deriveAmount(mapping, row)
  const description = mapping.description ? row[mapping.description]?.trim() : undefined
  const category = mapping.category ? row[mapping.category]?.trim() : 'Other'
  const type = mapping.type ? row[mapping.type]?.trim()?.toLowerCase() : undefined
  const tagsRaw = mapping.tags ? row[mapping.tags]?.trim() : undefined

  // Determine type
  let txType: 'income' | 'expense' | 'transfer' = 'expense'
  if (type === 'income' || type === 'credit') txType = 'income'
  else if (type === 'transfer') txType = 'transfer'
  else if (amount > 0) txType = 'income'

  const tags = tagsRaw
    ? tagsRaw.split(/[;,]/).map((t) => t.trim()).filter(Boolean)
    : undefined

  return {
    type: txType,
    amount: Math.abs(amount),
    currency: 'USD',
    date,
    category: category || 'Other',
    description,
    tags: tags?.length ? tags : undefined,
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ImportWizardProps {
  onComplete: () => void
}

const DEVICE_ID = 'local-device'

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const [step, dispatch] = useReducer(reducer, { type: 'upload', error: null })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    track.csvUploaded()
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      const result = parseCsv(text)
      if (!result.ok) {
        dispatch({ type: 'FILE_ERROR', message: result.error.message })
        return
      }
      if (result.value.rows.length === 0) {
        dispatch({ type: 'FILE_ERROR', message: 'CSV file has no data rows' })
        return
      }
      dispatch({ type: 'FILE_LOADED', csv: result.value })
    }
    reader.onerror = () => {
      dispatch({ type: 'FILE_ERROR', message: 'Failed to read file' })
    }
    reader.readAsText(file)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  async function handleConfirmImport(
    csv: ParsedCsv,
    mapping: MappingResult,
    dateFormat: string,
  ) {
    dispatch({ type: 'SET_IMPORTING' })

    // Dynamic import to avoid circular dep at module level
    const { useTransactionStore } = await import('../model/transaction-store')
    const store = useTransactionStore.getState()
    const add = store.add.bind(store)

    let imported = 0
    let skipped = 0

    for (const row of csv.rows) {
      const input = rowToInput(row, mapping.autoMapped, dateFormat)
      if (!input) {
        skipped++
        continue
      }
      try {
        await add(input, DEVICE_ID)
        imported++
      } catch {
        skipped++
      }
    }

    dispatch({ type: 'IMPORT_COMPLETE', imported, skipped })
    track.transactionImported(imported)
  }

  // ── Upload step ──
  if (step.type === 'upload') {
    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
          }}
        >
          <p className="text-sm text-muted-foreground">
            Drop a CSV file here, or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
        {step.error && (
          <p className="text-sm text-destructive" role="alert">{step.error}</p>
        )}
      </div>
    )
  }

  // ── Mapping step ──
  if (step.type === 'mapping') {
    return (
      <ColumnMappingStep
        headers={step.csv.headers}
        rows={step.csv.rows.slice(0, 5)}
        initialMapping={step.mapping}
        dateFormat={step.dateFormat}
        onConfirm={(mapping, dateFormat) =>
          dispatch({ type: 'MAPPING_CONFIRMED', mapping, dateFormat })
        }
        onBack={() => dispatch({ type: 'RESET' })}
      />
    )
  }

  // ── Confirm step ──
  if (step.type === 'confirm') {
    return (
      <ImportPreviewStep
        rowCount={step.csv.rows.length}
        mapping={step.mapping}
        dateFormat={step.dateFormat}
        importing={step.importing}
        onConfirm={() =>
          void handleConfirmImport(step.csv, step.mapping, step.dateFormat)
        }
        onBack={() =>
          dispatch({
            type: 'MAPPING_CONFIRMED',
            mapping: step.mapping,
            dateFormat: step.dateFormat,
          })
        }
      />
    )
  }

  // ── Done step ──
  return (
    <div className="space-y-4 text-center py-4">
      <p className="text-sm">
        Imported <strong>{step.imported}</strong> transactions
        {step.skipped > 0 && (
          <>
            {' '}({step.skipped} skipped)
          </>
        )}
      </p>
      <div className="flex justify-end gap-2">
        <Button onClick={onComplete}>Done</Button>
      </div>
    </div>
  )
}
