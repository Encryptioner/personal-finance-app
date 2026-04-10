/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-floating-promises */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createDriveClient } from './drive-client'
import { UnauthorizedError, ConflictError, RateLimitError } from './errors'

const API_BASE = 'https://www.googleapis.com'

const server = setupServer()

describe('DriveClient', () => {
  beforeEach(() => {
    server.listen()
  })

  afterEach(() => {
    server.close()
  })

  it('lists files with query filter', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, ({ request }: { request: Request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('spaces') === 'appDataFolder') {
          return HttpResponse.json({
            files: [
              { id: 'file-1', name: 'transactions.json', mimeType: 'application/json' },
            ],
          })
        }
        return HttpResponse.json({ files: [] })
      }),
    )

    const client = createDriveClient('mock-token')
    const result = await client.list("name='transactions.json'")

    expect(result.files).toHaveLength(1)
    expect(result.files[0]!.name).toBe('transactions.json')
  })

  it('gets file content with ETag', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.text('{"transactions":[]}', {
          headers: {
            'ETag': '"abc123"',
            'Content-Type': 'application/json',
          },
        })
      }),
    )

    const client = createDriveClient('mock-token')
    const result = await client.get('file-1')

    expect(result.body).toBe('{"transactions":[]}')
    expect(result.etag).toBe('"abc123"')
  })

  it('creates a new file', async () => {
    server.use(
      http.post(`${API_BASE}/upload/drive/v3/files`, () => {
        return HttpResponse.json(
          { id: 'new-file-1', name: 'transactions.json' },
          { status: 200 },
        )
      }),
    )

    const client = createDriveClient('mock-token')
    const result = await client.create(
      { name: 'transactions.json', parents: ['appDataFolder'] },
      '{"transactions":[]}',
    )

    expect(result.id).toBe('new-file-1')
  })

  it('updates file content with ETag', async () => {
    server.use(
      http.patch(`${API_BASE}/upload/drive/v3/files/file-1`, async ({ request }: { request: Request }) => {
        const ifMatch = request.headers.get('if-match')
        if (ifMatch === '"abc123"') {
          return HttpResponse.json(
            { id: 'file-1' },
            {
              headers: { 'ETag': '"xyz789"' },
            },
          )
        }
        return HttpResponse.json(
          { error: { code: 412, message: 'Precondition Failed' } },
          { status: 412 },
        )
      }),
    )

    const client = createDriveClient('mock-token')
    const result = await client.update('file-1', '{"transactions":[1]}', '"abc123"')

    expect(result.etag).toBe('"xyz789"')
  })

  it('throws ConflictError on 412 Precondition Failed', async () => {
    server.use(
      http.patch(`${API_BASE}/upload/drive/v3/files/file-1`, () => {
        return HttpResponse.json(
          { error: { code: 412, message: 'Precondition Failed' } },
          { status: 412 },
        )
      }),
    )

    const client = createDriveClient('mock-token')

    expect(client.update('file-1', '{"transactions":[]}', '"old-etag"')).rejects.toThrow(
      ConflictError,
    )
  })

  it('throws UnauthorizedError on 401 Unauthorized', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.json(
          { error: { code: 401, message: 'Unauthorized' } },
          { status: 401 },
        )
      }),
    )

    const client = createDriveClient('invalid-token')

    expect(client.get('file-1')).rejects.toThrow(UnauthorizedError)
  })

  it('throws RateLimitError on 429 Too Many Requests', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.json({ error: { code: 429, message: 'Too Many Requests' } }, { status: 429 })
      }),
    )

    const client = createDriveClient('mock-token')

    expect(client.get('file-1')).rejects.toThrow(RateLimitError)
  })

  it('throws RateLimitError on 500 Server Error', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.json(
          { error: { code: 500, message: 'Internal Server Error' } },
          { status: 500 },
        )
      }),
    )

    const client = createDriveClient('mock-token')

    expect(client.get('file-1')).rejects.toThrow(RateLimitError)
  })

  it('includes auth token in requests', async () => {
    let authHeaderSeen = false

    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, ({ request }: { request: Request }) => {
        authHeaderSeen = request.headers.get('authorization') === 'Bearer mock-token-123'
        return HttpResponse.text('{}')
      }),
    )

    const client = createDriveClient('mock-token-123')
    await client.get('file-1')

    expect(authHeaderSeen).toBe(true)
  })
})
