import { describe, it, expect } from 'vitest'
import {
  mapColumns,
  type ColumnMapping,
} from './csv-column-mapper'

describe('mapColumns', () => {
  it('auto-maps Date, Amount, Description headers', () => {
    const result = mapColumns(['Date', 'Amount', 'Description'])
    expect(result.autoMapped.date).toBe('Date')
    expect(result.autoMapped.amount).toBe('Amount')
    expect(result.autoMapped.description).toBe('Description')
    expect(result.unmapped).toEqual([])
  })

  it('auto-maps regardless of header order', () => {
    const result = mapColumns(['Description', 'Date', 'Amount'])
    expect(result.autoMapped.date).toBe('Date')
    expect(result.autoMapped.amount).toBe('Amount')
    expect(result.autoMapped.description).toBe('Description')
  })

  it('maps Transaction Date → date', () => {
    const result = mapColumns(['Transaction Date', 'Amount', 'Memo'])
    expect(result.autoMapped.date).toBe('Transaction Date')
    expect(result.autoMapped.description).toBe('Memo')
  })

  it('maps Debit/Credit columns → amount with sign inference', () => {
    const result = mapColumns([
      'Transaction Date',
      'Debit',
      'Credit',
      'Memo',
    ])
    expect(result.autoMapped.date).toBe('Transaction Date')
    expect(result.autoMapped.description).toBe('Memo')
    expect(result.autoMapped.debitColumn).toBe('Debit')
    expect(result.autoMapped.creditColumn).toBe('Credit')
    expect(result.amountMode).toBe('debitCredit')
  })

  it('maps Category column', () => {
    const result = mapColumns(['Date', 'Amount', 'Category'])
    expect(result.autoMapped.category).toBe('Category')
  })

  it('maps Type column', () => {
    const result = mapColumns(['Date', 'Amount', 'Type'])
    expect(result.autoMapped.type).toBe('Type')
  })

  it('reports unknown headers as unmapped', () => {
    const result = mapColumns(['Date', 'Weird Column', 'Amount'])
    expect(result.unmapped).toEqual(['Weird Column'])
  })

  it('requires date column (no auto-map → unmapped required)', () => {
    const result = mapColumns(['Amount', 'Description'])
    expect(result.autoMapped.date).toBeUndefined()
    expect(result.missingRequired).toContain('date')
  })

  it('requires amount column or debit+credit columns', () => {
    const result = mapColumns(['Date', 'Description'])
    expect(result.autoMapped.amount).toBeUndefined()
    expect(result.autoMapped.debitColumn).toBeUndefined()
    expect(result.missingRequired).toContain('amount')
  })

  it('case-insensitive header matching', () => {
    const result = mapColumns(['date', 'AMOUNT', 'Description'])
    expect(result.autoMapped.date).toBe('date')
    expect(result.autoMapped.amount).toBe('AMOUNT')
  })

  it('maps common synonyms: Trans Date, Txn Date', () => {
    const r1 = mapColumns(['Trans Date', 'Amount'])
    expect(r1.autoMapped.date).toBe('Trans Date')

    const r2 = mapColumns(['Txn Date', 'Amount'])
    expect(r2.autoMapped.date).toBe('Txn Date')
  })

  it('maps common synonyms: Memo, Note, Notes → description', () => {
    const r1 = mapColumns(['Date', 'Amount', 'Memo'])
    expect(r1.autoMapped.description).toBe('Memo')

    const r2 = mapColumns(['Date', 'Amount', 'Note'])
    expect(r2.autoMapped.description).toBe('Note')
  })

  it('maps Tags column', () => {
    const result = mapColumns(['Date', 'Amount', 'Tags'])
    expect(result.autoMapped.tags).toBe('Tags')
  })

  it('applies manual overrides to unmapped fields', () => {
    const result = mapColumns(
      ['Foo', 'Amount', 'Bar'],
      { date: 'Foo', description: 'Bar' },
    )
    expect(result.autoMapped.date).toBe('Foo')
    expect(result.autoMapped.description).toBe('Bar')
    expect(result.missingRequired).toEqual([])
  })

  it('amountMode is "single" when Amount column found', () => {
    const result = mapColumns(['Date', 'Amount'])
    expect(result.amountMode).toBe('single')
  })
})

describe('ColumnMapping type', () => {
  it('derives amount from debit/credit columns', () => {
    const mapping: ColumnMapping = {
      date: 'Transaction Date',
      debitColumn: 'Debit',
      creditColumn: 'Credit',
      description: 'Memo',
    }
    const row = {
      'Transaction Date': '2024-01-15',
      Debit: '50.00',
      Credit: '',
      Memo: 'Store purchase',
    }
    const amount = deriveAmount(mapping, row)
    expect(amount).toBe(-5000) // debit → negative expense
  })

  it('derives amount from credit column', () => {
    const mapping: ColumnMapping = {
      date: 'Transaction Date',
      debitColumn: 'Debit',
      creditColumn: 'Credit',
      description: 'Memo',
    }
    const row = {
      'Transaction Date': '2024-01-15',
      Debit: '',
      Credit: '100.00',
      Memo: 'Refund',
    }
    const amount = deriveAmount(mapping, row)
    expect(amount).toBe(10000) // credit → positive income
  })
})

// Import the helper for the debit/credit test
import { deriveAmount } from './csv-column-mapper'
