export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string // UUID v7 (time-sortable)
  type: TransactionType
  /**
   * Integer minor units — no floats.
   * USD $12.34 → 1234 (cents)
   * JPY ¥1234  → 1234 (no subdivision, getDecimalPlaces('JPY') === 0)
   * KWD 12.345 → 12345 (fils, getDecimalPlaces('KWD') === 3)
   */
  amount: number
  currency: string // ISO 4217
  date: string // YYYY-MM-DD
  category: string
  description?: string
  tags?: string[]
  notes?: string
  createdAt: string // ISO 8601 datetime
  updatedAt: string // ISO 8601 datetime — LWW key for sync merge
  deletedAt?: string // tombstone; presence means soft-deleted
  deviceId: string // which device last edited (tiebreaker for LWW)
}

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'deviceId'>
export type TransactionPatch = Partial<TransactionInput>
