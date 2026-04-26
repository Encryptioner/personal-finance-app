export type Theme = 'light' | 'dark' | 'system'

export interface UserSettings {
  currency: string // ISO 4217 default currency
  locale: string // BCP 47 locale tag, e.g. 'en-US'
  theme: Theme
  deviceId: string // UUID, persisted to IndexedDB
  dismissedSignInBanner: boolean
  analyticsEnabled: boolean // opt-out of anonymous feature-usage telemetry
}

export const DEFAULT_SETTINGS: UserSettings = {
  currency: 'USD',
  locale: 'en-US',
  theme: 'system',
  deviceId: '',
  dismissedSignInBanner: false,
  analyticsEnabled: true,
}
