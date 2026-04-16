import { describe, it, expect } from 'vitest'
import { DriveError, UnauthorizedError, ConflictError, RateLimitError, NetworkError } from './errors'

describe('DriveError', () => {
  it('sets message and status', () => {
    const e = new DriveError('something went wrong', 500)
    expect(e.message).toBe('something went wrong')
    expect(e.status).toBe(500)
    expect(e.name).toBe('DriveError')
  })

  it('is an instance of Error', () => {
    expect(new DriveError('x', 0)).toBeInstanceOf(Error)
  })
})

describe('UnauthorizedError', () => {
  it('has status 401 and correct name', () => {
    const e = new UnauthorizedError()
    expect(e.status).toBe(401)
    expect(e.name).toBe('UnauthorizedError')
  })

  it('accepts custom message', () => {
    expect(new UnauthorizedError('custom msg').message).toBe('custom msg')
  })

  it('instanceof DriveError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(DriveError)
  })
})

describe('ConflictError', () => {
  it('has status 412 and correct name', () => {
    const e = new ConflictError()
    expect(e.status).toBe(412)
    expect(e.name).toBe('ConflictError')
  })

  it('accepts custom message', () => {
    expect(new ConflictError('etag mismatch').message).toBe('etag mismatch')
  })
})

describe('RateLimitError', () => {
  it('has status 429 and correct name', () => {
    const e = new RateLimitError()
    expect(e.status).toBe(429)
    expect(e.name).toBe('RateLimitError')
  })
})

describe('NetworkError', () => {
  it('has status 0 and correct name', () => {
    const e = new NetworkError()
    expect(e.status).toBe(0)
    expect(e.name).toBe('NetworkError')
  })

  it('uses default message when none given', () => {
    expect(new NetworkError().message).toBe('Network error')
  })

  it('accepts custom message', () => {
    expect(new NetworkError('timeout').message).toBe('timeout')
  })

  it('instanceof DriveError', () => {
    expect(new NetworkError()).toBeInstanceOf(DriveError)
  })
})
