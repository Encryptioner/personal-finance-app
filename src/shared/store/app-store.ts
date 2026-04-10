import { create } from 'zustand'
import type { Transaction } from '@/shared/types/transaction'

export interface Settings {
  currency: string
  theme: 'light' | 'dark' | 'system'
  locale: string
}

export interface AuthState {
  isSignedIn: boolean
  accessToken?: string
  deviceId: string
}

export interface AppStore {
  // Transactions
  transactions: Transaction[]
  setTransactions: (txs: Transaction[]) => void

  // Settings
  settings: Settings
  updateSettings: (partial: Partial<Settings>) => void

  // Auth
  auth: AuthState
  setAuth: (partial: Partial<AuthState>) => void
}

// Load initial settings from localStorage
const getInitialSettings = (): Settings => {
  try {
    const stored = localStorage.getItem('pfa-settings')
    if (stored) {
      const parsed = JSON.parse(stored) as Settings
      return parsed
    }
  } catch {
    // Fall through to defaults
  }
  return {
    currency: 'USD',
    theme: 'system',
    locale: 'en',
  }
}

// Load initial auth from sessionStorage (not localStorage for security)
const getInitialAuth = (): AuthState => {
  try {
    const stored = sessionStorage.getItem('pfa-auth')
    if (stored) {
      const parsed = JSON.parse(stored) as AuthState
      return parsed
    }
  } catch {
    // Fall through to defaults
  }
  return {
    isSignedIn: false,
    deviceId: '', // Will be populated from IndexedDB
  }
}

export const useStore = create<AppStore>((set) => ({
  transactions: [],
  setTransactions: (txs) => set({ transactions: txs }),

  settings: getInitialSettings(),
  updateSettings: (partial) =>
    set((state) => {
      const updated = { ...state.settings, ...partial }
      localStorage.setItem('pfa-settings', JSON.stringify(updated))
      return { settings: updated }
    }),

  auth: getInitialAuth(),
  setAuth: (partial) =>
    set((state) => {
      const updated = { ...state.auth, ...partial }
      sessionStorage.setItem('pfa-auth', JSON.stringify(updated))
      return { auth: updated }
    }),
}))
