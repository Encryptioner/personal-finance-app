import { describe, it, expect } from 'vitest'
import { resolveDefaultLocale, getUserCurrency } from './locale'

describe('getUserCurrency', () => {
  it('en-US → USD', () => expect(getUserCurrency('en-US')).toBe('USD'))
  it('en-GB → GBP', () => expect(getUserCurrency('en-GB')).toBe('GBP'))
  it('de-DE → EUR', () => expect(getUserCurrency('de-DE')).toBe('EUR'))
  it('fr-FR → EUR', () => expect(getUserCurrency('fr-FR')).toBe('EUR'))
  it('ja-JP → JPY', () => expect(getUserCurrency('ja-JP')).toBe('JPY'))
  it('ko-KR → KRW', () => expect(getUserCurrency('ko-KR')).toBe('KRW'))
  it('bn-BD → BDT', () => expect(getUserCurrency('bn-BD')).toBe('BDT'))
  it('hi-IN → INR', () => expect(getUserCurrency('hi-IN')).toBe('INR'))
  it('ar-AE → AED', () => expect(getUserCurrency('ar-AE')).toBe('AED'))
  it('unknown locale falls back to USD', () => expect(getUserCurrency('zz-ZZ')).toBe('USD'))
  it('case-insensitive region', () => expect(getUserCurrency('en-us')).toBe('USD'))
})

describe('resolveDefaultLocale', () => {
  it('returns a non-empty string', () => {
    expect(typeof resolveDefaultLocale()).toBe('string')
    expect(resolveDefaultLocale().length).toBeGreaterThan(0)
  })

  it('returns navigator.language when available', () => {
    Object.defineProperty(navigator, 'language', { value: 'fr-FR', writable: true, configurable: true })
    expect(resolveDefaultLocale()).toBe('fr-FR')
  })

  it('returns "en-US" when navigator.language is empty string', () => {
    Object.defineProperty(navigator, 'language', { value: '', writable: true, configurable: true })
    expect(resolveDefaultLocale()).toBe('en-US')
  })
})

describe('getUserCurrency - edge cases', () => {
  it('returns USD for locale with no region subtag', () => {
    expect(getUserCurrency('en')).toBe('USD')
  })
})
