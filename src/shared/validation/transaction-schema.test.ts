import { describe, it, expect } from 'vitest'
import { transactionSchema, transactionInputSchema } from './transaction-schema'
import { MESSAGES } from '@/shared/constants/messages'

const validTransaction = {
  id: '01956b4a-1234-7000-8000-abcdef012345',
  type: 'expense' as const,
  amount: 1234,
  currency: 'USD',
  date: '2026-04-10',
  category: 'Food',
  createdAt: '2026-04-10T10:00:00Z',
  updatedAt: '2026-04-10T10:00:00Z',
  deviceId: 'device-abc',
}

const validInput = {
  type: 'expense' as const,
  amount: 1234,
  currency: 'USD',
  date: '2026-04-10',
  category: 'Food',
}

describe('transactionSchema', () => {
  it('accepts a valid full transaction', () => {
    expect(transactionSchema.safeParse(validTransaction).success).toBe(true)
  })

  it('accepts optional fields when omitted', () => {
    const result = transactionSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
  })

  it('accepts optional description, tags, notes, deletedAt', () => {
    const result = transactionSchema.safeParse({
      ...validTransaction,
      description: 'Lunch',
      tags: ['food', 'work'],
      notes: 'paid cash',
      deletedAt: '2026-04-11T10:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing amount', () => {
    const { amount: _, ...rest } = validTransaction
    const result = transactionSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: -1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.negativeAmount)
    }
  })

  it('rejects non-integer amount', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: 12.34 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.invalidAmount)
    }
  })

  it('rejects invalid currency (lowercase)', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, currency: 'usd' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.invalidCurrency)
    }
  })

  it('rejects currency that is not 3 uppercase letters', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, currency: 'US' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.invalidCurrency)
    }
  })

  it('rejects invalid date format', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, date: '04/10/2026' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.invalidDate)
    }
  })

  it('rejects date more than 1 year in the future', () => {
    const farFuture = new Date()
    farFuture.setFullYear(farFuture.getFullYear() + 2)
    const dateStr = farFuture.toISOString().slice(0, 10)
    const result = transactionSchema.safeParse({ ...validTransaction, date: dateStr })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.futureDateTooFar)
    }
  })

  it('accepts a date exactly 1 year in the future', () => {
    const boundary = new Date()
    boundary.setFullYear(boundary.getFullYear() + 1)
    const dateStr = boundary.toISOString().slice(0, 10)
    const result = transactionSchema.safeParse({ ...validTransaction, date: dateStr })
    expect(result.success).toBe(true)
  })

  it('rejects invalid type', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, type: 'savings' })
    expect(result.success).toBe(false)
  })

  it('rejects empty id', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, id: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.invalidId)
    }
  })

  it('rejects empty deviceId', () => {
    const result = transactionSchema.safeParse({ ...validTransaction, deviceId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.missingDeviceId)
    }
  })
})

describe('transactionInputSchema', () => {
  it('accepts a valid input (no system fields)', () => {
    expect(transactionInputSchema.safeParse(validInput).success).toBe(true)
  })

  it('rejects missing category', () => {
    const { category: _, ...rest } = validInput
    const result = transactionInputSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = transactionInputSchema.safeParse({ ...validInput, amount: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(MESSAGES.validation.invalidAmount)
    }
  })
})
