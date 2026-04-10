import { db } from '@/shared/db/db'
import { mergeTransactions } from '@/features/sync/model/merge'
import { removeStaleTombstones } from '@/features/sync/model/tombstone-gc'
import type { DriveFileManager } from '@/features/sync/api/drive-file-manager'
import type { DriveFileBody } from '@/shared/types/sync'

const CURRENT_SCHEMA_VERSION = 1
const MAX_RETRIES = 5

export interface SyncResult {
  ok: boolean
  mergedCount?: number
  error?: string
}

/**
 * Sync orchestration service — coordinates a full sync cycle.
 *
 * Flow:
 * 1. Read local transactions from Dexie
 * 2. Read remote file from Drive (with ETag)
 * 3. Merge using pure merge function (LWW)
 * 4. Write merged result back to Drive (with ETag for concurrency)
 * 5. Update local DB with merged result
 * 6. Broadcast sync completion to other tabs
 *
 * On conflict (412 ETag mismatch): re-read, re-merge, retry (max 5 times)
 */
export function createSyncService(deviceId: string, driveFileManager: DriveFileManager) {
  /**
   * Run one sync cycle.
   * @param fileId - Drive file ID for transactions.json
   * @param retryCount - internal retry counter (starts at 0)
   */
  async function runSync(fileId: string, retryCount: number = 0): Promise<SyncResult> {
    if (retryCount >= MAX_RETRIES) {
      return {
        ok: false,
        error: `Max retries (${MAX_RETRIES}) exceeded`,
      }
    }

    try {
      // Step 1: Read local state
      const local = await db.transactions.toArray()

      // Step 2: Read remote state
      const { body: remote, etag } = await driveFileManager.readTransactionsFile(fileId)

      // Step 3: Schema guard — don't corrupt a newer app's file
      if (remote.schemaVersion > CURRENT_SCHEMA_VERSION) {
        return {
          ok: false,
          error: `Remote schema v${remote.schemaVersion} — update this app to sync`,
        }
      }

      // Step 4: Merge transactions
      const merged = mergeTransactions(local, remote.transactions)

      // Step 5: Clean up stale tombstones (older than 90 days)
      const cleaned = removeStaleTombstones(merged, new Date(), 90)

      // Step 6: Prepare next file body
      const now = new Date().toISOString()
      const nextBody: DriveFileBody = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        lastModified: now,
        devices: trackDevice(remote.devices, deviceId, now),
        transactions: cleaned,
      }

      // Step 7: Write back to Drive (optimistic concurrency)
      await driveFileManager.writeTransactionsFile(fileId, nextBody, etag)

      // Step 8: Update local DB with merged result
      await db.transactions.bulkPut(cleaned)

      // Step 9: Return success
      return {
        ok: true,
        mergedCount: cleaned.length,
      }
    } catch (e) {
      if (e instanceof Error && 'status' in e && (e as { status?: number }).status === 412) {
        // ETag conflict — re-read, re-merge, retry
        await new Promise((resolve) =>
          setTimeout(resolve, exponentialBackoff(retryCount)),
        )
        return runSync(fileId, retryCount + 1)
      }

      // Non-412 error: bubble up
      throw e
    }
  }

  return {
    runSync,
  }
}

/**
 * Track device in the Drive file's device list.
 * Keeps a cap of 10 devices (LRU eviction).
 */
function trackDevice(
  devices: { id: string; lastSeen: string; userAgent: string }[],
  deviceId: string,
  now: string,
): { id: string; lastSeen: string; userAgent: string }[] {
  // Remove if already present, will re-add at the front
  const filtered = devices.filter((d) => d.id !== deviceId)

  // Add current device at the front
  const updated = [
    {
      id: deviceId,
      lastSeen: now,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    },
    ...filtered,
  ]

  // Keep only the 10 most recent (LRU)
  return updated.slice(0, 10)
}

/**
 * Exponential backoff: 2^retryCount seconds, capped at 60s.
 */
function exponentialBackoff(retryCount: number): number {
  const baseMs = 1000
  const delay = baseMs * Math.pow(2, retryCount)
  return Math.min(delay, 60000)
}

export type SyncService = ReturnType<typeof createSyncService>
