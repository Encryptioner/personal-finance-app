import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the underlying analytics module BEFORE importing analytics-service
const mockInitAnalytics = vi.fn()
const mockTrackEvent = vi.fn()

vi.mock('./analytics', () => ({
  initAnalytics: mockInitAnalytics,
  trackEvent: mockTrackEvent,
}))

const { track } = await import('./analytics-service')

describe('analytics-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exposes all required track methods', () => {
    expect(typeof track.transactionAdded).toBe('function')
    expect(typeof track.syncStarted).toBe('function')
    expect(typeof track.signInSuccess).toBe('function')
  })

  describe('track.transactionAdded', () => {
    it('calls trackEvent with transaction_added and type', () => {
      track.transactionAdded('expense')
      expect(mockTrackEvent).toHaveBeenCalledWith('transaction_added', { transaction_type: 'expense' })
    })
  })

  describe('track.transactionEdited', () => {
    it('calls trackEvent with transaction_edited and type', () => {
      track.transactionEdited('income')
      expect(mockTrackEvent).toHaveBeenCalledWith('transaction_edited', { transaction_type: 'income' })
    })
  })

  describe('track.transactionDeleted', () => {
    it('calls trackEvent with transaction_deleted and type', () => {
      track.transactionDeleted('transfer')
      expect(mockTrackEvent).toHaveBeenCalledWith('transaction_deleted', { transaction_type: 'transfer' })
    })
  })

  describe('track.transactionImported', () => {
    it('calls trackEvent with import_count', () => {
      track.transactionImported(42)
      expect(mockTrackEvent).toHaveBeenCalledWith('transaction_imported', { import_count: 42 })
    })
  })

  describe('track.syncStarted', () => {
    it('calls trackEvent with sync_started', () => {
      track.syncStarted()
      expect(mockTrackEvent).toHaveBeenCalledWith('sync_started', undefined)
    })
  })

  describe('track.syncCompleted', () => {
    it('calls trackEvent with duration and count', () => {
      track.syncCompleted(500, 10)
      expect(mockTrackEvent).toHaveBeenCalledWith('sync_completed', { duration_ms: 500, transaction_count: 10 })
    })

    it('calls trackEvent without transaction_count when omitted', () => {
      track.syncCompleted(300)
      expect(mockTrackEvent).toHaveBeenCalledWith('sync_completed', { duration_ms: 300, transaction_count: undefined })
    })
  })

  describe('track.syncFailed', () => {
    it('calls trackEvent with error_type', () => {
      track.syncFailed('network_error')
      expect(mockTrackEvent).toHaveBeenCalledWith('sync_failed', { error_type: 'network_error' })
    })
  })

  describe('track.navigatedToReports', () => {
    it('calls trackEvent with navigated_to_reports', () => {
      track.navigatedToReports()
      expect(mockTrackEvent).toHaveBeenCalledWith('navigated_to_reports', undefined)
    })
  })

  describe('track.navigatedToSettings', () => {
    it('calls trackEvent with navigated_to_settings', () => {
      track.navigatedToSettings()
      expect(mockTrackEvent).toHaveBeenCalledWith('navigated_to_settings', undefined)
    })
  })

  describe('track.csvUploaded', () => {
    it('calls trackEvent with csv_uploaded', () => {
      track.csvUploaded()
      expect(mockTrackEvent).toHaveBeenCalledWith('csv_uploaded', undefined)
    })
  })

  describe('track.csvImportCompleted', () => {
    it('calls trackEvent with count and success', () => {
      track.csvImportCompleted(5, true)
      expect(mockTrackEvent).toHaveBeenCalledWith('csv_import_completed', { import_count: 5, success: true })
    })
  })

  describe('track.csvExportStarted', () => {
    it('calls trackEvent with csv_export_started', () => {
      track.csvExportStarted()
      expect(mockTrackEvent).toHaveBeenCalledWith('csv_export_started', undefined)
    })
  })

  describe('track.jsonExportStarted', () => {
    it('calls trackEvent with json_export_started', () => {
      track.jsonExportStarted()
      expect(mockTrackEvent).toHaveBeenCalledWith('json_export_started', undefined)
    })
  })

  describe('track.signInInitiated', () => {
    it('calls trackEvent with sign_in_initiated', () => {
      track.signInInitiated()
      expect(mockTrackEvent).toHaveBeenCalledWith('sign_in_initiated', undefined)
    })
  })

  describe('track.signInSuccess', () => {
    it('calls trackEvent with sign_in_success', () => {
      track.signInSuccess()
      expect(mockTrackEvent).toHaveBeenCalledWith('sign_in_success', undefined)
    })
  })

  describe('track.signOut', () => {
    it('calls trackEvent with sign_out', () => {
      track.signOut()
      expect(mockTrackEvent).toHaveBeenCalledWith('sign_out', undefined)
    })
  })

  describe('track.appInstalled', () => {
    it('calls trackEvent with app_installed', () => {
      track.appInstalled()
      expect(mockTrackEvent).toHaveBeenCalledWith('app_installed', undefined)
    })
  })

  describe('track.appOpened', () => {
    it('calls trackEvent with app_opened', () => {
      track.appOpened()
      expect(mockTrackEvent).toHaveBeenCalledWith('app_opened', undefined)
    })
  })

})
