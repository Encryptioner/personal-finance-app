/**
 * Sync-specific error types for Drive API operations.
 */

export class DriveError extends Error {
  name = 'DriveError'
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    Object.setPrototypeOf(this, DriveError.prototype)
  }
}

export class UnauthorizedError extends DriveError {
  name = 'UnauthorizedError'

  constructor(message = 'Unauthorized: token expired or invalid') {
    super(message, 401)
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ConflictError extends DriveError {
  name = 'ConflictError'

  constructor(message = 'Conflict: ETag mismatch (concurrent edit)') {
    super(message, 412)
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class RateLimitError extends DriveError {
  name = 'RateLimitError'

  constructor(message = 'Rate limit exceeded or server error') {
    super(message, 429)
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

export class NetworkError extends DriveError {
  name = 'NetworkError'

  constructor(message = 'Network error') {
    super(message, 0)
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}
