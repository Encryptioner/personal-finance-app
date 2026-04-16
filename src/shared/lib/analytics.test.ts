import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('analytics - unconfigured (default test env)', () => {
  beforeEach(() => {
    window.dataLayer = []
    // Remove any existing GA scripts
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove())
  })

  it('initAnalytics does not add a script when GA ID is not set', async () => {
    const { initAnalytics } = await import('./analytics')
    initAnalytics()
    expect(document.head.querySelector('script[src*="googletagmanager"]')).toBeNull()
  })

  it('trackPageView is a no-op when not configured', async () => {
    const { trackPageView } = await import('./analytics')
    trackPageView('/test')
    expect(window.dataLayer).toHaveLength(0)
  })

  it('trackEvent is a no-op when not configured', async () => {
    const { trackEvent } = await import('./analytics')
    trackEvent('page_view', { page: '/test' })
    expect(window.dataLayer).toHaveLength(0)
  })
})

describe('analytics - configured', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST12345')
    window.dataLayer = []
    document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('initializes dataLayer when it is not pre-set', async () => {
    delete (window as Partial<Window>).dataLayer
    const { initAnalytics } = await import('./analytics')
    initAnalytics()
    expect(window.dataLayer).toBeDefined()
  })

  it('initAnalytics appends a gtag script to document.head', async () => {
    const { initAnalytics } = await import('./analytics')
    initAnalytics()
    const script = document.head.querySelector('script[src*="googletagmanager"]')
    expect(script).not.toBeNull()
    expect(script?.getAttribute('src')).toContain('G-TEST12345')
  })

  it('initAnalytics pushes js and config to dataLayer', async () => {
    const { initAnalytics } = await import('./analytics')
    initAnalytics()
    // First push: ['js', Date]
    expect(window.dataLayer[0]).toEqual(expect.arrayContaining(['js']))
    // Second push: ['config', 'G-TEST12345', {...}]
    expect(window.dataLayer[1]).toEqual(
      expect.arrayContaining(['config', 'G-TEST12345'])
    )
  })

  it('trackPageView pushes page_view event to dataLayer', async () => {
    const { initAnalytics, trackPageView } = await import('./analytics')
    initAnalytics()
    window.dataLayer = []
    trackPageView('/reports')
    expect(window.dataLayer[0]).toEqual(
      expect.arrayContaining(['event', 'page_view'])
    )
  })

  it('trackEvent pushes custom event to dataLayer', async () => {
    const { initAnalytics, trackEvent } = await import('./analytics')
    initAnalytics()
    window.dataLayer = []
    trackEvent('transaction_added', { transaction_type: 'expense' })
    expect(window.dataLayer[0]).toEqual(
      expect.arrayContaining(['event', 'transaction_added'])
    )
  })

  it('trackEvent with no params still pushes event', async () => {
    const { initAnalytics, trackEvent } = await import('./analytics')
    initAnalytics()
    window.dataLayer = []
    trackEvent('app_opened')
    expect(window.dataLayer).toHaveLength(1)
  })
})
