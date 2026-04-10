import { create } from 'zustand'
import { db } from '@/shared/db/db'
import { DEFAULT_SETTINGS } from '@/shared/types/settings'
import { applyTheme } from '@/features/settings/lib/theme-manager'
import type { UserSettings, Theme } from '@/shared/types/settings'

interface SettingsState {
  settings: UserSettings
  isLoading: boolean
  initialize: () => Promise<void>
  updateTheme: (theme: Theme) => Promise<void>
  updateCurrency: (currency: string) => Promise<void>
  updateLocale: (locale: string) => Promise<void>
}

const SETTINGS_KEY = 'pfa-settings'

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  initialize: async () => {
    try {
      const stored = await db.metadata.get(SETTINGS_KEY)
      const loaded: UserSettings = stored || DEFAULT_SETTINGS
      set({ settings: loaded, isLoading: false })
      // Apply theme on init
      applyTheme(loaded.theme)
    } catch (error) {
      console.error('[settings-store] Failed to initialize:', error)
      set({ settings: DEFAULT_SETTINGS, isLoading: false })
    }
  },

  updateTheme: async (theme: Theme) => {
    const updated = { ...get().settings, theme }
    set({ settings: updated })
    applyTheme(theme)
    await db.metadata.put({ key: SETTINGS_KEY, ...updated })
  },

  updateCurrency: async (currency: string) => {
    const updated = { ...get().settings, currency }
    set({ settings: updated })
    await db.metadata.put({ key: SETTINGS_KEY, ...updated })
  },

  updateLocale: async (locale: string) => {
    const updated = { ...get().settings, locale }
    set({ settings: updated })
    await db.metadata.put({ key: SETTINGS_KEY, ...updated })
  },
}))
