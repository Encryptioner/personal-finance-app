# Changelog

All notable changes to Personal Finance App are documented here.

---

## [v0.1.0-alpha] — 2026-04-17

Initial alpha release. Zero-backend personal finance PWA — all data stays in your
browser and your own Google Drive. No sign-up, no servers, no subscriptions.

### :sparkles: New Features

**Transactions**
- Add, edit, and delete income, expense, and transfer entries
- Filter transactions by date range, type, category, and text search
- Sort by date or amount (ascending / descending)
- All data persists locally in IndexedDB — works fully offline

**CSV Import**
- Upload a bank CSV and map columns to the right fields (date, amount, description)
- Automatic date-format detection (ISO, US MM/DD/YYYY, EU DD/MM/YYYY)
- Duplicate detection skips rows already in your data
- Preview the first 5 rows before committing

**Export**
- Export all transactions to a spreadsheet-friendly CSV
- Export to JSON for full data portability and off-site backup

**Google Drive Sync**
- Optional sign in with Google — the app works fully without it
- Data syncs bidirectionally across all your devices via your own Drive (hidden app folder; not visible in "My Drive")
- Per-transaction merge: edits from multiple devices are reconciled without data loss
- Deletes propagate correctly across devices (tombstone-based)
- ETag concurrency control automatically retries on write conflicts
- Auto-syncs on mutation, reconnect, and tab focus change — no manual action needed
- Sync button in the header shows live status (synced / syncing / error / offline)

**Reports**
- Dashboard summary tile: total income, expenses, and net
- Dedicated Reports page with category donut chart and monthly trend line
- Date range picker: last 30 days, this month, last month, this year, and custom
- All charts have a "View as table" fallback for screen readers

**Settings**
- Theme toggle: System / Light / Dark (persists across reloads)
- Default currency and locale override (any ISO 4217 currency)
- Export buttons: JSON and CSV
- Sign-out clears all auth state

**PWA**
- Installable on Android Chrome, desktop Chrome / Edge, and other Chromium browsers
- Full offline support after first visit — all core operations work without internet
- Pending changes queue in IndexedDB and sync automatically when connectivity returns
- "Update available" toast when a new version is deployed

**Privacy & Auth**
- Privacy policy page explaining the zero-backend / zero-tracking data model
- Clear error message when Google Sign-In is not configured (dev/preview environments)
- Access tokens stored in memory only — never in `localStorage`

### :bug: Bug Fixes

- Sign-in shows a clear error when `VITE_GOOGLE_CLIENT_ID` is not set, instead of a silent failure
- GitHub Pages deployment now correctly uses Actions-based source (SPA deep links work)
- Node version aligned to 24 in CI to match local `.nvmrc`

### :lock: Security

- Content Security Policy restricts scripts to `'self'` and `accounts.google.com`
- Drive API access limited to `drive.appdata` scope — the app cannot read your files
- Tokens never written to `localStorage` (XSS hardening)

---

## Gap Analysis (vs. spec v2.1 + plan v2.1)

> This section tracks known divergences and missing items relative to the
> full implementation plan. It is for internal tracking; remove before tagging a stable release.

### :warning: Spec Divergences

| # | Area | Divergence | Risk |
|---|------|-----------|------|
| G1 | Analytics | `src/shared/lib/analytics.ts` loads Google Analytics (gtag.js) when `VITE_GA_MEASUREMENT_ID` is set. Spec §2 principle 0 explicitly prohibits external telemetry ("debug via browser devtools only"). The no-op guard when the env var is unset mitigates practical impact, but it violates the zero-backend principle. | Medium |

### :construction: Missing E2E Test Coverage

The plan specified six E2E specs; only three exist (`smoke.spec.ts`, `offline.spec.ts`, `a11y.spec.ts`). Missing:

| Spec file | What it covers |
|-----------|---------------|
| `e2e/transactions.spec.ts` | Add / edit / delete / reload persistence (plan phase 2 E2E gate) |
| `e2e/auth.spec.ts` | GIS mock sign-in flow, silent re-auth, sign-out (plan phase 4 E2E gate) |
| `e2e/sync.spec.ts` | Full sync cycle with mocked Drive: add → sync → remote change → re-sync (plan phase 5 E2E gate) |
| `e2e/sync-conflict.spec.ts` | 412 Precondition Failed retry path (plan phase 5 E2E gate) |
| `e2e/install.spec.ts` | `beforeinstallprompt` fires (plan phase 8 E2E gate) |
| `e2e/update.spec.ts` | SW update toast appears after new deployment (plan phase 8 E2E gate) |

### :bar_chart: Unverified Quality Gates

| Gate | Spec requirement | Status |
|------|-----------------|--------|
| Lighthouse Performance | ≥ 95 | Not confirmed — lighthouserc config added but scores not recorded |
| Lighthouse Accessibility | ≥ 95 | Not confirmed |
| Lighthouse Best Practices | ≥ 95 | Not confirmed |
| Lighthouse PWA | 100 | Not confirmed |
| Bundle — initial gzipped | < 250 KB | Not measured |
| Bundle — total gzipped | < 500 KB | Not measured |

### :white_check_mark: Confirmed Complete (plan acceptance criteria)

- [x] All 10 plan phases implemented and committed
- [x] 484+ tests passing (Vitest)
- [x] Property-based merge tests: commutativity, associativity, idempotence (manual, no fast-check library — plan marks fast-check as optional)
- [x] axe-core integrated in `e2e/a11y.spec.ts` against all pages
- [x] Error boundary (`shared/ui/ErrorBoundary.tsx`) with "Copy error details" fallback
- [x] SW update prompt (`shared/ui/UpdatePrompt.tsx`)
- [x] Tombstone GC after 90 days
- [x] Multi-tab coordination via `BroadcastChannel('pfa-sync')`
- [x] Privacy policy page
- [x] Token state machine with 100% strict TDD coverage
- [x] Device ID in IndexedDB (not localStorage) for stable cross-session identity
