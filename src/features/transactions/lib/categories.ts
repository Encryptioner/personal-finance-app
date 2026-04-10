/** Default category list. User can add custom categories in Phase 7 (Settings). */
export const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Housing & Rent',
  'Utilities',
  'Healthcare',
  'Entertainment',
  'Shopping',
  'Education',
  'Salary',
  'Freelance',
  'Investment',
  'Savings',
  'Transfer',
  'Other',
] as const

export type DefaultCategory = (typeof DEFAULT_CATEGORIES)[number]
