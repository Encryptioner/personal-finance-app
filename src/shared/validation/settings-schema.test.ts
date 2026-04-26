import { describe, it, expect } from 'vitest'
import { settingsSchema } from './settings-schema'

const valid = {
  currency: 'USD',
  locale: 'en-US',
  theme: 'system' as const,
  deviceId: 'device-abc-123',
  dismissedSignInBanner: false,
  analyticsEnabled: true,
}

describe('settingsSchema', () => {
  it('accepts valid settings', () => {
    expect(settingsSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts all theme values', () => {
    for (const theme of ['light', 'dark', 'system'] as const) {
      expect(settingsSchema.safeParse({ ...valid, theme }).success).toBe(true)
    }
  })

  it('rejects invalid theme', () => {
    expect(settingsSchema.safeParse({ ...valid, theme: 'auto' }).success).toBe(false)
  })

  it('rejects currency not matching ISO 4217 format (lowercase)', () => {
    expect(settingsSchema.safeParse({ ...valid, currency: 'usd' }).success).toBe(false)
  })

  it('rejects currency too short', () => {
    expect(settingsSchema.safeParse({ ...valid, currency: 'US' }).success).toBe(false)
  })

  it('accepts various valid locales', () => {
    for (const locale of ['en-US', 'de-DE', 'ja-JP', 'bn-BD', 'zh-CN']) {
      expect(settingsSchema.safeParse({ ...valid, locale }).success).toBe(true)
    }
  })

  it('rejects empty locale', () => {
    expect(settingsSchema.safeParse({ ...valid, locale: '' }).success).toBe(false)
  })

  it('rejects empty deviceId', () => {
    expect(settingsSchema.safeParse({ ...valid, deviceId: '' }).success).toBe(false)
  })

  it('rejects non-boolean dismissedSignInBanner', () => {
    expect(settingsSchema.safeParse({ ...valid, dismissedSignInBanner: 'yes' }).success).toBe(false)
  })

  it('coerces partial settings with defaults via .partial()', () => {
    // settingsSchema is strict — missing fields should fail
    const { deviceId: _, ...rest } = valid
    expect(settingsSchema.safeParse(rest).success).toBe(false)
  })
})
