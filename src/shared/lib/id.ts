import { v7 as uuidv7 } from 'uuid'

/**
 * Generate a UUID v7 — time-sortable, so IDs are lexicographically increasing.
 * Prefer over v4 for transaction IDs: sorted lists don't need a separate date index.
 */
export function generateId(): string {
  return uuidv7()
}
