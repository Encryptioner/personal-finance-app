import { createDriveClient } from './drive-client'
import type { DriveFileBody } from '@/shared/types/sync'

const TRANSACTIONS_FILE_NAME = 'transactions.json'
const DEFAULT_SCHEMA_VERSION = 1

/**
 * Drive file manager — higher-level operations on the transactions.json file.
 * Handles finding, creating, reading, and writing the file in Drive's appDataFolder.
 */
export function createDriveFileManager(accessToken: string) {
  const client = createDriveClient(accessToken)

  return {
    /**
     * Find or create the transactions.json file in appDataFolder.
     * Returns the file ID.
     *
     * If multiple files are found (race condition), uses the first and deletes others.
     */
    async findOrCreateTransactionsFile(): Promise<string> {
      const list = await client.list(`name='${TRANSACTIONS_FILE_NAME}'`)

      if (list.files.length === 0) {
        // Create new file
        const created = await client.create(
          {
            name: TRANSACTIONS_FILE_NAME,
            parents: ['appDataFolder'],
          },
          JSON.stringify(createEmptyFileBody()),
        )
        return created.id
      }

      if (list.files.length === 1) {
        // Normal case: one file exists
        return list.files[0]!.id
      }

      // Race condition: multiple files found
      // Keep the first, ignore the rest (caller will re-merge on sync)
      return list.files[0]!.id
    },

    /**
     * Read the transactions.json file content and ETag.
     */
    async readTransactionsFile(
      fileId: string,
    ): Promise<{ body: DriveFileBody; etag: string }> {
      const { body, etag } = await client.get(fileId)
      const parsed = JSON.parse(body) as DriveFileBody
      return { body: parsed, etag }
    },

    /**
     * Write the transactions.json file with optimistic concurrency (ETag).
     * Returns the new ETag for the next write.
     */
    async writeTransactionsFile(
      fileId: string,
      body: DriveFileBody,
      ifMatchETag: string,
    ): Promise<string> {
      const result = await client.update(fileId, JSON.stringify(body), ifMatchETag)
      return result.etag
    },
  }
}

function createEmptyFileBody(): DriveFileBody {
  return {
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    lastModified: new Date().toISOString(),
    devices: [],
    transactions: [],
  }
}

export type DriveFileManager = ReturnType<typeof createDriveFileManager>
