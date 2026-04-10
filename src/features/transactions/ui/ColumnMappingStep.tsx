import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type ColumnMapping,
  type MappingResult,
  mapColumns,
} from '../api/csv-column-mapper'

/* ------------------------------------------------------------------ */
/*  Field definitions                                                  */
/* ------------------------------------------------------------------ */

const MAPPABLE_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: false },
  { key: 'debitColumn', label: 'Debit', required: false },
  { key: 'creditColumn', label: 'Credit', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'category', label: 'Category', required: false },
  { key: 'type', label: 'Type', required: false },
  { key: 'tags', label: 'Tags', required: false },
]

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ColumnMappingStepProps {
  headers: string[]
  rows: Record<string, string>[]
  initialMapping: MappingResult
  dateFormat: string
  onConfirm: (mapping: MappingResult, dateFormat: string) => void
  onBack: () => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ColumnMappingStep({
  headers,
  rows,
  initialMapping,
  dateFormat,
  onConfirm,
  onBack,
}: ColumnMappingStepProps) {
  const [overrides, setOverrides] = useState<Partial<ColumnMapping>>({})

  // Merge auto-mapping with user overrides
  const currentMapping = mapColumns(headers, {
    ...initialMapping.autoMapped,
    ...overrides,
  })

  const hasRequiredFields = currentMapping.missingRequired.length === 0

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Map CSV columns to transaction fields. Auto-detected mappings are pre-selected.
      </p>

      {/* Column mapping dropdowns */}
      <div className="space-y-3">
        {MAPPABLE_FIELDS.map((field) => {
          const currentValue = getCurrentValue(field.key, currentMapping.autoMapped, overrides)

          return (
            <div key={field.key} className="flex items-center gap-3">
              <Label className="w-28 shrink-0 text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Select
                value={currentValue ?? '__none__'}
                onValueChange={(val) => {
                  setOverrides((prev) => ({
                    ...prev,
                    [field.key]: val === '__none__' ? undefined : val,
                  }))
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select column…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— none —</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>

      {/* Detected date format */}
      <div className="flex items-center gap-3">
        <Label className="w-28 shrink-0 text-sm">Date format</Label>
        <Select
          value={dateFormat}
          onValueChange={(val) => {
            // Re-confirm mapping with new date format
            onConfirm(currentMapping, val)
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="iso">YYYY-MM-DD (ISO)</SelectItem>
            <SelectItem value="us">MM/DD/YYYY (US)</SelectItem>
            <SelectItem value="eu">DD/MM/YYYY (EU)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Missing fields warning */}
      {currentMapping.missingRequired.length > 0 && (
        <p className="text-xs text-destructive">
          Missing required fields: {currentMapping.missingRequired.join(', ')}
        </p>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="border border-border rounded-md overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                {headers.map((h) => {
                  const mappedTo = getMappedFieldLabel(h, currentMapping.autoMapped)
                  return (
                    <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                      {h}
                      {mappedTo && (
                        <span className="ml-1 text-primary">({mappedTo})</span>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1 whitespace-nowrap">
                      {row[h] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          disabled={!hasRequiredFields}
          onClick={() => onConfirm(currentMapping, dateFormat)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCurrentValue(
  key: keyof ColumnMapping,
  autoMapped: ColumnMapping,
  overrides: Partial<ColumnMapping>,
): string | undefined {
  if (key in overrides) return overrides[key]
  return autoMapped[key]
}

function getMappedFieldLabel(
  header: string,
  autoMapped: ColumnMapping,
): string | null {
  for (const [key, val] of Object.entries(autoMapped)) {
    if (val === header) {
      const field = MAPPABLE_FIELDS.find((f) => f.key === key)
      return field?.label ?? key
    }
  }
  return null
}
