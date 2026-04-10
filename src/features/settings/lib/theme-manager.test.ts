import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveTheme, applyTheme } from './theme-manager'

describe('theme-manager', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    vi.clearAllMocks()
  })

  describe('resolveTheme()', () => {
    it('returns "light" when explicitly set to light', () => {
      expect(resolveTheme('light')).toBe('light')
    })

    it('returns "dark" when explicitly set to dark', () => {
      expect(resolveTheme('dark')).toBe('dark')
    })

    it('returns "light" when system prefers light and theme is system', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: dark)' ? false : true,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      expect(resolveTheme('system')).toBe('light')
    })

    it('returns "dark" when system prefers dark and theme is system', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: dark)' ? true : false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      expect(resolveTheme('system')).toBe('dark')
    })
  })

  describe('applyTheme()', () => {
    it('sets data-theme="dark" when applying dark', () => {
      applyTheme('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('sets data-theme="light" when applying light', () => {
      applyTheme('light')
      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    })

    it('removes data-theme when applying system', () => {
      document.documentElement.setAttribute('data-theme', 'dark')
      applyTheme('system')
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })
  })
})
