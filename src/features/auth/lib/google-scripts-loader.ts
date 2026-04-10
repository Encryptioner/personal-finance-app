const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

/**
 * Append the Google Identity Services script to <head>.
 * Resolves when the script loads and `window.google` is available.
 * Safe to call multiple times — returns the same promise.
 */
let loadPromise: Promise<void> | null = null

export function loadGoogleScripts(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    // Already loaded (e.g. SSR or prior page load kept in memory)
    if (
      typeof window !== 'undefined' &&
      window.google?.accounts?.oauth2
    ) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script'))
    document.head.appendChild(script)
  })

  return loadPromise
}
