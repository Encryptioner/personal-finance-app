/** All user-facing and domain error strings. No inline strings anywhere else. */
export const MESSAGES = {
  validation: {
    required: (field: string) => `${field} is required`,
    invalidAmount: 'Amount must be a positive number',
    negativeAmount: 'Amount cannot be negative',
    invalidCurrency: 'Currency must be a valid ISO 4217 code (e.g. USD, EUR)',
    invalidDate: 'Date must be in YYYY-MM-DD format',
    futureDateTooFar: 'Date cannot be more than 1 year in the future',
    invalidType: 'Type must be income, expense, or transfer',
    invalidId: 'ID must be a non-empty string',
    missingDeviceId: 'Device ID is required for sync',
  },
  sync: {
    offline: "You're offline — changes saved locally",
    unsupportedSchema: (version: number) =>
      `Remote data uses schema v${version}. Please update the app to sync.`,
    maxRetries: 'Sync failed after multiple attempts. Please try again.',
    conflict412: 'Sync conflict detected — retrying…',
  },
  auth: {
    signInRequired: 'Sign in with Google to sync across devices',
    tokenExpired: 'Your session has expired. Please sign in again.',
    signInFailed: 'Sign-in failed. Please try again.',
  },
  csv: {
    noDateColumn: 'No date column detected in CSV',
    noAmountColumn: 'No amount column detected in CSV',
    parseError: (row: number) => `Could not parse row ${row}`,
  },
  settings: {
    exportSuccess: (format: string) => `Exported as ${format}`,
    exportError: 'Export failed. Please try again.',
    settingsSaved: 'Settings saved',
  },
} as const
