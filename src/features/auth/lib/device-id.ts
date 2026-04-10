import { db } from '@/shared/db/db'
import { generateId } from '@/shared/lib/id'
import { DEFAULT_SETTINGS } from '@/shared/types/settings'

const METADATA_KEY = 'settings'

/**
 * Get or create a persistent device ID stored in IndexedDB metadata.
 * This ID survives reloads and is used as a tiebreaker in sync merge.
 */
export async function getDeviceId(): Promise<string> {
  const row = await db.metadata.get(METADATA_KEY)
  if (row?.deviceId) return row.deviceId

  const deviceId = generateId()
  await db.metadata.put({
    key: METADATA_KEY,
    ...DEFAULT_SETTINGS,
    deviceId,
  })
  return deviceId
}
