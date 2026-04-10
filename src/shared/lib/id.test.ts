import { describe, it, expect } from 'vitest'
import { generateId } from './id'

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string')
  })

  it('two sequential calls produce different IDs', () => {
    expect(generateId()).not.toBe(generateId())
  })

  it('IDs are lexicographically increasing when generated in sequence', () => {
    const ids = Array.from({ length: 20 }, () => generateId())
    const sorted = [...ids].sort()
    expect(ids).toEqual(sorted)
  })

  it('matches UUID v7 format', () => {
    const uuidV7Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(generateId()).toMatch(uuidV7Regex)
  })
})
