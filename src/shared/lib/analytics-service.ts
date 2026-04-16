/**
 * Centralized Analytics Service.
 *
 * Type-safe wrapper around gtag.js. If VITE_GA_MEASUREMENT_ID is unset or
 * is the placeholder value, all calls become no-ops (privacy mode).
 */

import { initAnalytics, trackEvent } from './analytics'

// ── Event types ──────────────────────────────────────────────────────

export type AnalyticsEventType =
  | 'app_installed'
  | 'app_opened'
  | 'transaction_added'
  | 'transaction_edited'
  | 'transaction_deleted'
  | 'transaction_imported'
  | 'transaction_exported'
  | 'sign_in_initiated'
  | 'sign_in_success'
  | 'sign_out'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'navigated_to_reports'
  | 'navigated_to_settings'
  | 'csv_uploaded'
  | 'csv_import_completed'
  | 'csv_export_started'
  | 'json_export_started'

type Scalar = string | number | boolean | undefined

interface EventParams {
  transaction_type?: 'income' | 'expense' | 'transfer'
  import_count?: number
  duration_ms?: number
  transaction_count?: number
  error_type?: string
  success?: boolean
  export_format?: 'csv' | 'json'
  [key: string]: Scalar
}

// ── Service ──────────────────────────────────────────────────────────

class AnalyticsService {
  private initialized = false

  initialize(): void {
    if (this.initialized) return
    initAnalytics()
    this.initialized = true
  }

  trackEvent(eventType: AnalyticsEventType, params?: EventParams): void {
    if (!this.initialized) return
    trackEvent(eventType, params as Record<string, string | number | boolean>)
  }


}

const service = new AnalyticsService()

// Initialize on module load
service.initialize()

// ── Convenience shorthands ───────────────────────────────────────────

export const track = {
  appInstalled: () => service.trackEvent('app_installed'),
  appOpened: () => service.trackEvent('app_opened'),

  transactionAdded: (type: 'income' | 'expense' | 'transfer') =>
    service.trackEvent('transaction_added', { transaction_type: type }),
  transactionEdited: (type: 'income' | 'expense' | 'transfer') =>
    service.trackEvent('transaction_edited', { transaction_type: type }),
  transactionDeleted: (type: 'income' | 'expense' | 'transfer') =>
    service.trackEvent('transaction_deleted', { transaction_type: type }),
  transactionImported: (count: number) =>
    service.trackEvent('transaction_imported', { import_count: count }),

  syncStarted: () => service.trackEvent('sync_started'),
  syncCompleted: (duration: number, transactionCount?: number) =>
    service.trackEvent('sync_completed', {
      duration_ms: duration,
      transaction_count: transactionCount,
    }),
  syncFailed: (errorType: string) =>
    service.trackEvent('sync_failed', { error_type: errorType }),

  navigatedToReports: () => service.trackEvent('navigated_to_reports'),
  navigatedToSettings: () => service.trackEvent('navigated_to_settings'),

  csvUploaded: () => service.trackEvent('csv_uploaded'),
  csvImportCompleted: (count: number, success: boolean) =>
    service.trackEvent('csv_import_completed', { import_count: count, success }),
  csvExportStarted: () => service.trackEvent('csv_export_started'),
  jsonExportStarted: () => service.trackEvent('json_export_started'),

  signInInitiated: () => service.trackEvent('sign_in_initiated'),
  signInSuccess: () => service.trackEvent('sign_in_success'),
  signOut: () => service.trackEvent('sign_out'),
}
