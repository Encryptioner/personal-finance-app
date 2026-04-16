/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-floating-promises */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createDriveClient } from './drive-client'
import { UnauthorizedError, ConflictError, RateLimitError, NetworkError } from './errors'

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

  it('lists files without query filter', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({ files: [] })
      }),
    )

    const client = createDriveClient('mock-token')
    const result = await client.list()
    expect(result.files).toHaveLength(0)
  })

  it('throws UnauthorizedError on 401 when listing files', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
      }),
    )

    const client = createDriveClient('bad-token')
    await expect(client.list()).rejects.toThrow(UnauthorizedError)
  })

  it('throws RateLimitError on 500 when listing files', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({ error: { message: 'Server Error' } }, { status: 500 })
      }),
    )

    const client = createDriveClient('mock-token')
    await expect(client.list()).rejects.toThrow(RateLimitError)
  })

  it('throws generic error on unexpected status for list', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({ error: { message: 'Bad Request' } }, { status: 400 })
      }),
    )

    const client = createDriveClient('mock-token')
    await expect(client.list()).rejects.toThrow('Drive API error: 400')
  })

  it('throws UnauthorizedError on 401 when updating file', async () => {
    server.use(
      http.patch(`${API_BASE}/upload/drive/v3/files/file-1`, () => {
        return HttpResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
      }),
    )

    const client = createDriveClient('bad-token')
    await expect(client.update('file-1', '{}', '"etag"')).rejects.toThrow(UnauthorizedError)
  })

  it('throws RateLimitError on 500 when updating file', async () => {
    server.use(
      http.patch(`${API_BASE}/upload/drive/v3/files/file-1`, () => {
        return HttpResponse.json({ error: { message: 'Server Error' } }, { status: 500 })
      }),
    )

    const client = createDriveClient('mock-token')
    await expect(client.update('file-1', '{}', '"etag"')).rejects.toThrow(RateLimitError)
  })

  it('throws generic error on unexpected status for update', async () => {
    server.use(
      http.patch(`${API_BASE}/upload/drive/v3/files/file-1`, () => {
        return HttpResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
      }),
    )

    const client = createDriveClient('mock-token')
    await expect(client.update('file-1', '{}', '"etag"')).rejects.toThrow('Drive API error: 403')
  })

  it('returns empty ETag string when header is missing on get', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.text('{}')
      }),
    )

    const client = createDriveClient('mock-token')
    const result = await client.get('file-1')
    expect(result.etag).toBe('')
  })

  it('returns empty ETag string when header is missing on update', async () => {
    server.use(
      http.patch(`${API_BASE}/upload/drive/v3/files/file-1`, () => {
        return HttpResponse.json({ id: 'file-1' })
      }),
    )

    const client = createDriveClient('mock-token')
    const result = await client.update('file-1', '{}', '"etag"')
    expect(result.etag).toBe('')
  })

  it('handles error response with non-object error field on get', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.json({ error: 'string-error' }, { status: 429 })
      }),
    )

    const client = createDriveClient('mock-token')
    await expect(client.get('file-1')).rejects.toThrow(RateLimitError)
  })

  it('throws NetworkError when fetch throws for list()', async () => {
    server.close()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const client = createDriveClient('mock-token')
    await expect(client.list()).rejects.toThrow(NetworkError)

    vi.restoreAllMocks()
    server.listen()
  })

  it('throws NetworkError when fetch throws for get()', async () => {
    server.close()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const client = createDriveClient('mock-token')
    await expect(client.get('file-1')).rejects.toThrow(NetworkError)

    vi.restoreAllMocks()
    server.listen()
  })

  it('throws NetworkError when fetch throws for create()', async () => {
    server.close()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const client = createDriveClient('mock-token')
    await expect(
      client.create({ name: 'transactions.json', parents: ['appDataFolder'] }, '{}')
    ).rejects.toThrow(NetworkError)

    vi.restoreAllMocks()
    server.listen()
  })

  it('throws NetworkError when fetch throws for update()', async () => {
    server.close()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const client = createDriveClient('mock-token')
    await expect(client.update('file-1', '{}', '"etag"')).rejects.toThrow(NetworkError)

    vi.restoreAllMocks()
    server.listen()
  })

  it('rethrows non-fetch errors from list()', async () => {
    server.close()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const client = createDriveClient('mock-token')
    await expect(client.list()).rejects.toThrow('ECONNREFUSED')

    vi.restoreAllMocks()
    server.listen()
  })

  it('throws ConflictError on 412 when listing files (via handleResponse)', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files`, () => {
        return HttpResponse.json({ error: { message: 'Conflict' } }, { status: 412 })
      }),
    )

    const client = createDriveClient('mock-token')
    await expect(client.list()).rejects.toThrow(ConflictError)
  })

  it('throws generic error on unexpected status for get()', async () => {
    server.use(
      http.get(`${API_BASE}/drive/v3/files/file-1`, () => {
        return HttpResponse.json({ error: { message: 'Forbidden' } }, { status: 403 })
      }),
    )

    const client = createDriveClient('mock-token')
    await expect(client.get('file-1')).rejects.toThrow('Drive API error: 403')
  })

  it('rethrows non-fetch errors from create()', async () => {
    server.close()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const client = createDriveClient('mock-token')
    await expect(
      client.create({ name: 'transactions.json', parents: ['appDataFolder'] }, '{}')
    ).rejects.toThrow('ECONNREFUSED')

    vi.restoreAllMocks()
    server.listen()
  })
})
