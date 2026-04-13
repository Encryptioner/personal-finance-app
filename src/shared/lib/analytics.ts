/**
 * Google Analytics gtag.js integration.
 * Loads gtag.js dynamically, respects privacy (no tracking if no measurement ID).
 */

type GtagParams = Record<string, string | number | boolean>

const GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID ?? '')

function isConfigured(): boolean {
  return Boolean(GA_MEASUREMENT_ID) && GA_MEASUREMENT_ID !== 'G-MEASUREMENT-ID'
}

function pushToDataLayer(...args: unknown[]): void {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(args)
}

/** Load the gtag.js script and initialize config. */
export function initAnalytics(): void {
  if (typeof window === 'undefined' || !isConfigured()) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  pushToDataLayer('js', new Date())
  pushToDataLayer('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip: true,
    cookie_expires: 63072000,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
}

/** Track a page view. */
export function trackPageView(path: string): void {
  if (!isConfigured()) return
  pushToDataLayer('event', 'page_view', { page_path: path, page_title: document.title })
}

/** Track a custom event. */
export function trackEvent(eventName: string, params?: GtagParams): void {
  if (!isConfigured()) return
  pushToDataLayer('event', eventName, params ?? {})
}
