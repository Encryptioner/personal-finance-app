import type { Transaction } from '@/shared/types/transaction'

/**
 * Aggregation functions for reports — pure, with no side effects.
 * All functions exclude tombstones (deleted transactions).
 */

/**
 * Group transactions by category, summed by amount.
 * Returns categories sorted by total amount (descending).
 */
export function byCategory(
  transactions: Transaction[],
  type: 'income' | 'expense' | 'transfer',
): Record<string, number> {
  const result: Record<string, number> = {}

  for (const tx of transactions) {
    // Skip deleted and mismatched type
    if (tx.deletedAt || tx.type !== type) continue

    result[tx.category] = (result[tx.category] || 0) + tx.amount
  }

  // Sort by amount descending
  return Object.fromEntries(
    Object.entries(result).sort(([, a], [, b]) => b - a),
  )
}

export interface MonthSummary {
  month: string // YYYY-MM
  income: number
  expense: number
  net: number
}

/**
 * Group transactions by month (YYYY-MM format).
 * Calculates income, expense, and net (income - expense - transfers).
 */
export function byMonth(transactions: Transaction[]): MonthSummary[] {
  const months = new Map<
    string,
    { income: number; expense: number; transfer: number }
  >()

  for (const tx of transactions) {
    // Skip deleted transactions
    if (tx.deletedAt) continue

    const month = tx.date.slice(0, 7) // YYYY-MM
    const entry = months.get(month) || { income: 0, expense: 0, transfer: 0 }

    if (tx.type === 'income') {
      entry.income += tx.amount
    } else if (tx.type === 'expense') {
      entry.expense += tx.amount
    } else if (tx.type === 'transfer') {
      entry.transfer += tx.amount
    }

    months.set(month, entry)
  }

  // Convert to sorted array
  return Array.from(months.entries())
    .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
    .map(([month, { income, expense, transfer }]) => ({
      month,
      income,
      expense: expense + transfer, // transfers count as expenses for net calc
      net: income - (expense + transfer),
    }))
}

export interface SummaryStats {
  income: number
  expense: number
  net: number
  count: number
  avgDailySpend: number
}

/**
 * Compute summary stats for a date range.
 * Calculates income, expense, net, transaction count, and average daily spend.
 */
export function summary(
  transactions: Transaction[],
  dateRange: { from: string; to: string },
): SummaryStats {
  let income = 0
  let expense = 0
  let count = 0

  for (const tx of transactions) {
    // Skip deleted and out-of-range
    if (tx.deletedAt) continue
    if (!isInRange(tx.date, dateRange)) continue

    count++

    if (tx.type === 'income') {
      income += tx.amount
    } else if (tx.type === 'expense') {
      expense += tx.amount
    } else if (tx.type === 'transfer') {
      expense += tx.amount
    }
  }

  const net = income - expense

  // Calculate days in range
  const fromDate = new Date(dateRange.from)
  const toDate = new Date(dateRange.to)
  const daysInRange = Math.floor(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
  ) + 1 // +1 to include both endpoints

  const avgDailySpend = daysInRange > 0 ? Math.floor(expense / daysInRange) : 0

  return {
    income,
    expense,
    net,
    count,
    avgDailySpend,
  }
}

/**
 * Check if a date falls within a range (inclusive).
 */
function isInRange(date: string, range: { from: string; to: string }): boolean {
  return date >= range.from && date <= range.to
}
