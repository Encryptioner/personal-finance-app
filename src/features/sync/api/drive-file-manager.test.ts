/* eslint-disable @typescript-eslint/require-await */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createDriveFileManager } from './drive-file-manager'
import type { DriveFileBody } from '@/shared/types/sync'

const API_BASE = 'https://www.googleapis.com'

const server = setupServer()

describe('DriveFileManager', () => {
  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.close()
  })

  it('finds existing transactions.json file', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({
          files: [{ id: 'existing-file-1', name: 'transactions.json' }],
        })
      }),
    )

    const manager = createDriveFileManager('mock-token')
    const fileId = await manager.findOrCreateTransactionsFile()

    expect(fileId).toBe('existing-file-1')
  })

  it('creates transactions.json if not found', async () => {
    let createCalled = false

    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({ files: [] })
      }),
      http.post(`${API_BASE}/upload/drive/v3/files`, () => {
        createCalled = true
        return HttpResponse.json({ id: 'new-file-1', name: 'transactions.json' })
      }),
    )

    const manager = createDriveFileManager('mock-token')
    const fileId = await manager.findOrCreateTransactionsFile()

    expect(fileId).toBe('new-file-1')
    expect(createCalled).toBe(true)
  })

  it('reads file content and ETag', async () => {
    const fileBody: DriveFileBody = {
      schemaVersion: 1,
      lastModified: '2026-04-10T12:00:00Z',
      devices: [],
      transactions: [],
    }

    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.text(JSON.stringify(fileBody), {
          headers: { 'ETag': '"abc123"' },
        })
      }),
    )

    const manager = createDriveFileManager('mock-token')
    const result = await manager.readTransactionsFile('file-1')

    expect(result.body).toEqual(fileBody)
    expect(result.etag).toBe('"abc123"')
  })

  it('writes file content with ETag', async () => {
    let patchCalled = false

    server.use(
      http.patch(`${API_BASE}/upload/drive/v3/files/file-1`, async ({ request }) => {
        patchCalled = true
        const ifMatch = request.headers.get('if-match')
        expect(ifMatch).toBe('"old-etag"')
        return HttpResponse.json(
          { id: 'file-1' },
          { headers: { 'ETag': '"new-etag"' } },
        )
      }),
    )

    const manager = createDriveFileManager('mock-token')
    const fileBody: DriveFileBody = {
      schemaVersion: 1,
      lastModified: '2026-04-10T12:00:00Z',
      devices: [],
      transactions: [],
    }

    const newEtag = await manager.writeTransactionsFile('file-1', fileBody, '"old-etag"')

    expect(newEtag).toBe('"new-etag"')
    expect(patchCalled).toBe(true)
  })

  it('handles multiple files found (merge and keep first)', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({
          files: [
            { id: 'file-1', name: 'transactions.json' },
            { id: 'file-2', name: 'transactions.json' },
          ],
        })
      }),
    )

    const manager = createDriveFileManager('mock-token')
    // This should return the first file and handle merge logic
    const fileId = await manager.findOrCreateTransactionsFile()

    expect(fileId).toBe('file-1')
  })

  it('parses ETag header correctly (preserves quotes)', async () => {
    const fileBody: DriveFileBody = {
      schemaVersion: 1,
      lastModified: '2026-04-10T12:00:00Z',
      devices: [],
      transactions: [],
    }

    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        // Google Drive returns ETags with quotes
        return HttpResponse.text(JSON.stringify(fileBody), {
          headers: { 'ETag': '"quoted-etag-value"' },
        })
      }),
    )

    const manager = createDriveFileManager('mock-token')
    const result = await manager.readTransactionsFile('file-1')

    // ETag should be returned exactly as provided (with quotes)
    expect(result.etag).toBe('"quoted-etag-value"')
  })
})
