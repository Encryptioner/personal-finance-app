import { UnauthorizedError, ConflictError, RateLimitError, NetworkError } from './errors'

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3'

/**
 * Google Drive REST API v3 client for appDataFolder operations.
 * Minimal wrapper around fetch with error handling.
 */

export interface DriveFile {
  id: string
  name: string
  mimeType?: string
}

export interface ListFilesResponse {
  files: DriveFile[]
}

export interface GetFileResponse {
  body: string
  etag: string
}

export interface CreateFileResponse {
  id: string
  name: string
}

export interface UpdateFileResponse {
  etag: string
}

export function createDriveClient(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      const errorMsg = error?.error?.message || response.statusText

      if (response.status === 401) {
        throw new UnauthorizedError(errorMsg)
      }
      if (response.status === 412) {
        throw new ConflictError(errorMsg)
      }
      if (response.status === 429 || response.status >= 500) {
        throw new RateLimitError(errorMsg)
      }

      throw new Error(`Drive API error: ${response.status} ${errorMsg}`)
    }

    return response.json() as Promise<T>
  }

  return {
    /**
     * List files in appDataFolder with optional query filter.
     * Example: list("name='transactions.json'")
     */
    async list(query?: string): Promise<ListFilesResponse> {
      try {
        const params = new URLSearchParams({
          spaces: 'appDataFolder',
          ...(query && { q: query }),
        })

        const response = await fetch(`${DRIVE_API_BASE}/files?${params.toString()}`, {
          headers,
        })

        return handleResponse<ListFilesResponse>(response)
      } catch (e) {
        if (e instanceof Error && e.message.includes('fetch')) {
          throw new NetworkError(e.message)
        }
        throw e
      }
    },

    /**
     * Get file content and ETag.
     * Returns file body as text + ETag header value.
     */
    async get(fileId: string): Promise<GetFileResponse> {
      try {
        const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
          headers,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          const errorMsg = error?.error?.message || response.statusText

          if (response.status === 401) {
            throw new UnauthorizedError(errorMsg)
          }
          if (response.status === 429 || response.status >= 500) {
            throw new RateLimitError(errorMsg)
          }

          throw new Error(`Drive API error: ${response.status} ${errorMsg}`)
        }

        const body = await response.text()
        const etag = response.headers.get('ETag') || ''

        return { body, etag }
      } catch (e) {
        if (e instanceof Error && e.message.includes('fetch')) {
          throw new NetworkError(e.message)
        }
        throw e
      }
    },

    /**
     * Create a new file in Drive.
     */
    async create(
      metadata: { name: string; parents?: string[] },
      body: string,
    ): Promise<CreateFileResponse> {
      try {
        const formData = new FormData()
        formData.append('metadata', JSON.stringify(metadata))
        formData.append('file', new Blob([body], { type: 'application/json' }))

        const response = await fetch(`${UPLOAD_API_BASE}/files?uploadType=multipart`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        })

        return handleResponse<CreateFileResponse>(response)
      } catch (e) {
        if (e instanceof Error && e.message.includes('fetch')) {
          throw new NetworkError(e.message)
        }
        throw e
      }
    },

    /**
     * Update file content with optimistic concurrency (ETag-based).
     * Throws ConflictError if ETag doesn't match (412).
     */
    async update(
      fileId: string,
      body: string,
      ifMatchETag: string,
    ): Promise<UpdateFileResponse> {
      try {
        const response = await fetch(`${UPLOAD_API_BASE}/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            ...headers,
            'If-Match': ifMatchETag,
          },
          body,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          const errorMsg = error?.error?.message || response.statusText

          if (response.status === 401) {
            throw new UnauthorizedError(errorMsg)
          }
          if (response.status === 412) {
            throw new ConflictError(errorMsg)
          }
          if (response.status === 429 || response.status >= 500) {
            throw new RateLimitError(errorMsg)
          }

          throw new Error(`Drive API error: ${response.status} ${errorMsg}`)
        }

        const etag = response.headers.get('ETag') || ''
        return { etag }
      } catch (e) {
        if (e instanceof Error && e.message.includes('fetch')) {
          throw new NetworkError(e.message)
        }
        throw e
      }
    },
  }
}

export type DriveClient = ReturnType<typeof createDriveClient>
