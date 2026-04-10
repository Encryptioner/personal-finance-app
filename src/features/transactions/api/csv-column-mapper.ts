export interface ColumnMapping {
  date: string
  amount?: string
  debitColumn?: string
  creditColumn?: string
  description?: string
  category?: string
  type?: string
  tags?: string
}

export interface MappingResult {
  autoMapped: ColumnMapping
  unmapped: string[]
  missingRequired: string[]
  amountMode: 'single' | 'debitCredit'
}

type FieldKey = keyof ColumnMapping

/** Synonym dictionary: canonical field → known header variants (lowercase). */
const SYNONYMS: Record<FieldKey, string[]> = {
  date: ['date', 'transaction date', 'trans date', 'txn date', 'posting date', 'value date', 'booking date'],
  amount: ['amount', 'amt', 'transaction amount', 'trans amount', 'value'],
  debitColumn: ['debit', 'debit amount', 'withdrawal', 'withdrawal amount', 'spent', 'payment', 'out'],
  creditColumn: ['credit', 'credit amount', 'deposit', 'deposit amount', 'received', 'receipt', 'in'],
  description: ['description', 'desc', 'memo', 'note', 'notes', 'narration', 'particulars', 'details', 'reference', 'payee', 'merchant'],
  category: ['category', 'cat', 'group'],
  type: ['type', 'transaction type', 'trans type', 'kind'],
  tags: ['tags', 'tag', 'labels', 'label'],
}

/**
 * Match a header against the synonym dictionary.
 * Returns the field key or undefined.
 */
function matchHeader(
  header: string,
  usedFields: Set<FieldKey>,
): FieldKey | undefined {
  const lower = header.toLowerCase().trim()
  for (const [field, synonyms] of Object.entries(SYNONYMS)) {
    if (usedFields.has(field as FieldKey)) continue
    if (synonyms.includes(lower)) {
      return field as FieldKey
    }
  }
  return undefined
}

/**
 * Attempt to auto-map CSV headers to Transaction fields.
 * Optionally accepts manual overrides for fields that didn't auto-map.
 */
export function mapColumns(
  headers: string[],
  overrides?: Partial<ColumnMapping>,
): MappingResult {
  const autoMapped: ColumnMapping = {} as ColumnMapping
  const usedFields = new Set<FieldKey>()
  const usedHeaders = new Set<number>()

  // First pass: auto-map from synonyms
  for (let i = 0; i < headers.length; i++) {
    const field = matchHeader(headers[i]!, usedFields)
    if (field) {
      ;(autoMapped as Record<FieldKey, string>)[field] = headers[i]!
      usedFields.add(field)
      usedHeaders.add(i)
    }
  }

  // Apply manual overrides
  if (overrides) {
    for (const [field, header] of Object.entries(overrides)) {
      if (header && !usedFields.has(field as FieldKey)) {
        ;(autoMapped as Record<FieldKey, string>)[field as FieldKey] = header
        usedFields.add(field as FieldKey)
      }
    }
  }

  // Determine amount mode
  const amountMode =
    autoMapped.debitColumn && autoMapped.creditColumn
      ? 'debitCredit' as const
      : 'single' as const

  // In debitCredit mode, if "amount" was auto-mapped it's redundant — remove it
  if (amountMode === 'debitCredit' && autoMapped.amount) {
    delete autoMapped.amount
    usedFields.delete('amount')
  }

  // Find unmapped headers
  const mappedHeaders = new Set(Object.values(autoMapped))
  const unmapped = headers.filter((h) => !mappedHeaders.has(h))

  // Find missing required fields
  const missingRequired: string[] = []
  if (!autoMapped.date) missingRequired.push('date')
  if (amountMode === 'single' && !autoMapped.amount) {
    missingRequired.push('amount')
  }
  if (amountMode === 'debitCredit' && (!autoMapped.debitColumn || !autoMapped.creditColumn)) {
    missingRequired.push('amount')
  }

  return { autoMapped, unmapped, missingRequired, amountMode }
}

/**
 * Derive the transaction amount (in minor units) from a row,
 * handling both single-amount and debit/credit column modes.
 * Debit amounts are negative (expenses), credit amounts are positive (income).
 */
export function deriveAmount(
  mapping: ColumnMapping,
  row: Record<string, string>,
): number {
  if (mapping.amount) {
    return parseMinorUnits(row[mapping.amount] ?? '0')
  }

  const debit = mapping.debitColumn ? (row[mapping.debitColumn] ?? '').trim() : ''
  const credit = mapping.creditColumn ? (row[mapping.creditColumn] ?? '').trim() : ''

  if (debit) {
    return -parseMinorUnits(debit) // expense → negative
  }
  return parseMinorUnits(credit) // income → positive
}

/**
 * Parse a decimal string to integer minor units.
 * "12.34" → 1234, "1,234.56" → 123456
 */
function parseMinorUnits(value: string): number {
  // Remove thousands separators
  const cleaned = value.replace(/,/g, '')
  const num = parseFloat(cleaned)
  if (Number.isNaN(num)) return 0
  return Math.round(num * 100)
}
