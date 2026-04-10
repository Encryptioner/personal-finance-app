import type { Theme } from '@/shared/types/settings'

/**
 * Resolve the effective theme (light or dark) given preference + system setting.
 */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  // system: check matchMedia
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

/**
 * Apply theme by setting data-theme attribute on <html>.
 * - 'light' → data-theme="light"
 * - 'dark' → data-theme="dark"
 * - 'system' → removes data-theme (let media query handle it)
 */
export function applyTheme(theme: Theme): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

/**
 * Listen to system dark mode changes and invoke callback.
 * Only relevant when theme is set to 'system'.
 */
export function listenToSystemTheme(callback: (isDark: boolean) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches)
  }

  mediaQuery.addEventListener('change', handler)

  // Return unsubscribe function
  return () => mediaQuery.removeEventListener('change', handler)
}
