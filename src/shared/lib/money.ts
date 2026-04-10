import type { Result } from '@/shared/types/result'
import { ok, err } from '@/shared/types/result'

/** Currencies with 0 decimal places (no subdivision) */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF',
  'XOF', 'XPF',
])

/** Currencies with 3 decimal places */
const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND',
])

/**
 * Returns the number of decimal places (minor unit exponent) for a currency.
 * Never assume ×100 — always use this function.
 */
export function getDecimalPlaces(currency: string): number {
  const code = currency.toUpperCase()
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3
  return 2
}

/**
 * Format integer minor units as a locale-aware currency string.
 * @param minorUnits - e.g. 1234 for $12.34 or ¥1234
 * @param currency - ISO 4217 code
 * @param locale - BCP 47 locale tag (default 'en-US')
 */
export function formatCurrency(
  minorUnits: number,
  currency: string,
  locale = 'en-US',
): string {
  const decimals = getDecimalPlaces(currency)
  const value = minorUnits / Math.pow(10, decimals)
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Parse a user-entered money string into integer minor units.
 * Strips currency symbols and whitespace, then scales.
 */
export function parseMoney(input: string, currency: string): Result<number> {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim()
  if (!cleaned) return err(new Error('Empty input'))

  // Normalise: remove thousands separators (comma), use dot for decimal
  const normalised = cleaned.replace(/,(\d{3})/g, '$1').replace(',', '.')
  const num = parseFloat(normalised)
  if (isNaN(num)) return err(new Error(`Cannot parse "${input}" as a number`))

  const decimals = getDecimalPlaces(currency)
  const minorUnits = Math.round(num * Math.pow(10, decimals))
  return ok(minorUnits)
}
