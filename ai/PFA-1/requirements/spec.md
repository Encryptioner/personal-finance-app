# Personal Finance PWA — MVP Specification (v2.0)

**Ticket:** PFA-1
**Document Version:** 2.0
**Date:** 2026-04-10
**Status:** Ready for TDD Planning
**Supersedes:** `specs/2026-04-04-personal-finance-pwa-mvp.md` (v1.0)

---

## 0. What Changed from v1.0

Summary of architectural fixes from the 2026-04-10 grill log (`ai/PFA-1/requirements/grill-log.md`):

| Area | v1.0 | v2.0 |
|------|------|------|
| OAuth scope | `drive.file` (broken cross-device) | **`drive.appdata`** (hidden app folder, cross-device consistent) |
| OAuth flow | `@react-oauth/google` `<GoogleLogin>` (ID token) | **GIS token client** via `useGoogleLogin({ flow: 'implicit' })` (access token + silent renewal) |
| Sync merge | Whole-file last-write-wins | **Per-transaction merge** + LWW per record + **ETag concurrency** + **tombstones** |
| Delete semantics | Undecided | **Tombstone with `deletedAt`**; delete-wins merge rule; GC after 90 days |
| Multi-tab | Not addressed | **`BroadcastChannel('pfa-sync')`** coordinates syncs across tabs |
| Architecture | Flat `components/services/stores` | **Feature-sliced modular monolith** (`features/*`, `shared/*`, `app/*`) |
| Framework | React 18 | **React 19 + React Compiler** |
| Styling | Tailwind v3 | **Tailwind v4 (CSS-first)** |
| Package manager | npm | **pnpm** (with `packageManager` field) |
| shadcn | `shadcn-ui` (deprecated) | **`shadcn`** (current package) |
| Service Worker | Custom build pipeline | **`vite-plugin-pwa`** (Workbox) |
| CSV parser | Custom | **`papaparse`** |
| TDD approach | Claimed but test-after | **Pragmatic TDD** at boundaries (red → green → refactor on pure logic, integration at I/O, E2E at user flows) |
| Deployment | Netlify/Vercel | **GitHub Pages (subpath)** via GitHub Actions |
| Dark mode | "Ready" | **Explicit MVP feature** |
| Multi-currency | $ only | **Locale-aware formatting** (`Intl.NumberFormat`/`DateTimeFormat`), user-selectable currency |
| Data export | Not mentioned | **Export all transactions to JSON/CSV** from Settings |
| Accessibility | Implied | **WCAG 2.1 AA commitment** with acceptance criteria |
| OAuth in webview | Assumed OK | **Blocked by Google** — documented; webview wrapper deferred |
| Doc layout | Loose `specs/` + `plans/` | **`ai/PFA-1/*` structure** |

---

## 1. Executive Summary

**Vision:** A zero-backend personal finance PWA that lets users track all monetary transactions, view detailed reports, and sync seamlessly across devices using their own Google Drive (hidden app folder). No sign-up friction, no 3rd-party data storage, no subscriptions, no lock-in.

**MVP Scope:** Single-user financial tracking with multi-device sync, manual entry + CSV import, guided Google sign-in, offline-first architecture, PWA installable on web/mobile/desktop, light/dark theme, locale-aware currency and date formatting, local export for data portability.

**Out of Scope (Phase 2+):** Shared/family expenses, recurring transactions, budget constraints, forecasting, receipt management, native iOS/Android wrappers, full string translations, real-time collaboration.

---

## 2. Core Principles

0. **Zero Backend — Hard Limit** — There is no server of ours, ever. Not for auth refresh, not for analytics, not for sync coordination, not for error reporting. If a feature needs a backend, it's out of MVP scope. This is non-negotiable and overrides every other design choice.
0a. **Simple Over Clever** — Maintainability comes from standard, boring patterns and small amounts of code — not from clever abstractions, premature optimization, or architectural showpieces. If two approaches both work, pick the one a newcomer could read in an afternoon. Every added dependency, every new file, every "what if we need to…" must justify itself.
1. **Zero Friction Setup** — One-click Google Sign-In, auto-creates hidden Drive folder, no API keys or manual configuration
2. **Offline-First** — Full app functionality without internet; syncs when available
3. **Multi-Device Sync** — Seamless data availability across phone, tablet, desktop; no device-specific setup
4. **User Data Ownership** — All data stored in the user's own Google Drive, user owns it entirely; local JSON/CSV export provides a non-Drive escape hatch
5. **Maintainability First** — Clean feature-sliced architecture, type-safe code, pragmatic TDD at boundaries, minimal dependencies
6. **Progressive Enhancement** — Web-first, PWA-installable, future-proof for native wrappers (Capacitor) — but not today
7. **Accessibility First** — WCAG 2.1 AA baseline from day one; keyboard-only navigation works; screen readers supported
8. **Locale Respect** — Dates, numbers, currencies default to browser locale; user can override currency

**What these principles rule out (explicitly):**
- Any server-side component, including serverless functions, edge workers, or "just a tiny proxy"
- Token refresh via HttpOnly cookies (needs a backend)
- Real-time sync via webhooks or WebSockets (needs a backend)
- External error tracking (Sentry, etc.) — debug via browser devtools only
- CRDTs, operational transforms, or custom merge DSLs — use simple LWW per record with tombstones
- Module Federation / micro-frontends — FSD gives us the modular benefits; actual MF is Phase 3+ at earliest
- Multi-tab leader election — each tab syncs independently with debouncing; tolerate occasional duplicate fetches
- A separate metadata file — inline metadata into `transactions.json`

---

## 3. User Personas & Journeys

### Persona 1: "Sarah" — Non-Technical, Mobile-First
- **Needs:** Quick transaction entry on phone, monthly summary, zero setup
- **Journey:**
  1. Opens web link on phone → "Sign In with Google" → Dashboard
  2. Adds 3–4 daily transactions (coffee, lunch, gas)
  3. Installs as PWA from browser prompt
  4. Checks monthly report (spent ₹12,000 on food this month — her locale, her currency)
  5. Opens desktop next week → sees all transactions synced automatically

### Persona 2: "Alex" — Technical, Historical Data
- **Needs:** Import bank CSV history, detailed reports, export for spreadsheets
- **Journey:**
  1. Signs in → imports 6 months of bank CSV (500+ transactions)
  2. App parses, deduplicates, previews, imports
  3. Reviews dashboard + trend chart on laptop; quick-adds on mobile
  4. Exports all transactions to JSON for off-site backup
  5. Changes sync across devices within seconds

### Persona 3: "Jordan" — Offline-Heavy Commuter
- **Needs:** Works offline on metro, syncs when connected
- **Journey:**
  1. Uses app offline on daily commute (no internet)
  2. Adds 2–3 transactions; sees ⏳ sync-pending badge
  3. Reaches office Wi-Fi → auto-sync in background
  4. Sees ✓ synced badge; changes visible on desktop

### Persona 4: "Priya" — Dark Mode & A11y
- **Needs:** Dark theme, keyboard-only navigation (wrist pain), high contrast
- **Journey:**
  1. System is in dark mode → app honors it automatically
  2. Navigates entire app with Tab / Shift-Tab / Enter / Escape
  3. Screen reader announces transaction amounts correctly ("forty-five dollars fifty cents, groceries, April 4th")

---

## 4. MVP Feature Set

### 4.1 Authentication & Google Sign-In

**Goal:** One tap, one popup, no config.

**OAuth Flow (Google Identity Services implicit token flow):**

- Library: `@react-oauth/google` but using the **`useGoogleLogin` hook** (not `<GoogleLogin>` button), configured for the **token flow**:
  ```ts
  const login = useGoogleLogin({
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    onSuccess: (resp) => { /* resp.access_token, resp.expires_in */ },
    onError: (err) => { /* handle */ },
  });
  ```
- **Scope:** `drive.appdata` — grants access ONLY to a hidden app-private folder (`appDataFolder`) that's invisible in the user's Drive UI but automatically cross-device consistent.
- **Token:** Access token only (no refresh token — there's no backend to store one). Lifetime: ~1 hour.
- **Silent renewal:** Before the access token expires (minus 2-minute skew), call the token client again with the same scope and `prompt: ''`. If the user has an active Google session in the browser, it returns a new access token with no UI. If it fails (user signed out, session expired), show an unobtrusive re-sign-in banner.
- **Storage:** Access token kept in-memory only (Zustand store). On tab close, user re-signs in — this is intentional and safer than localStorage for tokens. Device-id (UUID) is persisted to IndexedDB so we know the device across reloads.

**UX Flow:**
1. User lands on login screen → "Sign In with Google" button centered, brief tagline: *"Your money. Your Drive. Never ours."*
2. Click → Google token popup (one-time consent)
3. Success → redirect to Dashboard
4. First transaction triggers first sync ("Syncing...")
5. Sync completes → "✓ Synced"

**Security Notes:**
- Access token never logged
- `drive.appdata` scope means we cannot read any other file in the user's Drive — minimal blast radius if the token leaks
- Silent renewal uses top-level navigation, not embedded iframes, to avoid third-party cookie issues in Safari/iOS
- **Webview wrappers:** Google blocks OAuth in embedded webviews. Any future Capacitor wrapper MUST use `@capacitor/browser` or a native OAuth plugin — not a WebView.

### 4.2 Transaction Management

**Data Model:**
```typescript
// Canonical in-memory / Drive representation
export interface Transaction {
  id: string;                 // UUID v7 (time-ordered, sorts nicely in lists)
  date: string;               // ISO date YYYY-MM-DD
  amount: number;             // positive, 2-decimal; currency stored separately
  currency: string;           // ISO 4217, e.g. 'USD', 'INR', 'EUR'
  type: 'expense' | 'income';
  category: string;           // slug: 'groceries', 'salary', ...
  description: string;
  tags: string[];
  notes: string;
  createdAt: string;          // ISO 8601
  updatedAt: string;          // ISO 8601 (merge key for LWW)
  deletedAt: string | null;   // tombstone timestamp, null when active
}

// Local-only metadata, NOT synced to Drive
export interface LocalTransactionMeta {
  syncStatus: 'pending' | 'synced' | 'error';
  lastSyncError?: string;
}
```

Local store combines these via a wrapper type:
```typescript
export type LocalTransaction = Transaction & LocalTransactionMeta;
```

**Core Operations:**
1. **Add** — Form: date, amount, currency, type, category, description, notes, tags. Validation via Zod. Instant UI; queued to sync.
2. **Edit** — Modal form pre-filled; bumps `updatedAt`; queued.
3. **Delete** — Confirm dialog → sets `deletedAt` (soft delete). Row disappears from UI immediately. Tombstone synced. GC'd after 90 days by any client.
4. **CSV Import** — Uses `papaparse` streaming. Preview first 10 rows, detect header, detect date format, show skipped invalid rows. Deduplicate by `(date, amount, description)` composite key against existing rows.

**Categories (MVP seed):**
- Expenses: Groceries, Dining & Restaurants, Transportation, Utilities, Entertainment, Shopping, Health & Fitness, Education, Travel, Subscriptions, Other
- Income: Salary, Freelance, Investments, Bonus, Other
- Stored as slugs; display names localized via a lookup map.

### 4.3 Reporting & Analytics

**Dashboard (default view):**
- Summary cards: This Month Income, This Month Expenses, Net, Top 3 Categories (with %)
- Category donut chart (top 6 categories for current month; "Other" bucket)
- Recent 10 transactions

**Reports Page:**
- Date range picker: This Month, Last 3 Months, Last 6 Months, This Year, Custom
- Category breakdown (donut + bar)
- Monthly trend (line, income vs. expenses, last 12 months)
- Statistics: avg daily spend, avg transaction, most-common category, total count

**Aggregation:**
- All queries are local (IndexedDB with Dexie indexes on `date`, `category`, `type`)
- Pure functions in `features/reports/lib/aggregation.ts` → heavily unit-tested (TDD-first)

**Charting library:** Recharts. Imported dynamically (`React.lazy`) on the Reports page only, so it doesn't inflate the initial bundle. Use named imports to let tree-shaking do its job. We only need three chart types (donut, bar, line); if bundle analysis shows Recharts is still too heavy, we'll revisit after shipping — don't optimize preemptively.

### 4.4 Sync Strategy

**Architecture:**

```
┌──────────────┐        ┌──────────────┐        ┌─────────────────────┐
│  Tab A       │        │  Tab B       │        │ Google Drive         │
│  (Phone)     │        │  (Laptop)    │        │ appDataFolder/       │
│  ┌────────┐  │        │  ┌────────┐  │        │  transactions.json   │
│  │Dexie   │◄─┼────┐   │  │Dexie   │◄─┼────┐   │  metadata.json       │
│  └────────┘  │    │   │  └────────┘  │    │   │                      │
│  Sync Engine │    │   │  Sync Engine │    │   │  (hidden from Drive  │
│  Broadcast   │◄───┘   │  Broadcast   │◄───┘   │   UI, auto cross-    │
│  Channel     │◄──────►│  Channel     │        │   device for same    │
└──────┬───────┘        └──────┬───────┘        │   OAuth client)      │
       │                       │                └──────────┬───────────┘
       │   ────── HTTPS (access token, ETag) ──────────────┘
       └───────────────────────┘
```

**File layout in `appDataFolder`:**
- `transactions.json` — the ONLY synced file. Contains transactions, tombstones, and top-level metadata (schema version, lastModified, last-known devices). One file = one ETag = simple concurrency.

We considered a separate `metadata.json` but inlining keeps the sync engine single-file and avoids a second ETag dance. Trade-off: the whole file is rewritten on each metadata update, which is fine at MVP scale (< 1 MB).

**Sync Flow (per-transaction merge + ETag):**

1. **Write path (local → Drive):**
   - Mutation → IndexedDB updated → mark `syncStatus='pending'` → enqueue sync job
   - Sync engine picks up job (debounced 500ms after last mutation)
   - Fetch current `transactions.json` + its ETag
   - Per-transaction merge:
     - For each transaction ID: keep the one with the latest `updatedAt`
     - If `deletedAt` is set on EITHER version → merged version has `deletedAt` (delete wins)
   - Upload merged file with `If-Match: <etag>` header
   - On 200: update local `syncStatus='synced'`, update metadata
   - On 412 Precondition Failed: fetch again, re-merge, retry (max 5 attempts with exponential backoff 500ms → 1s → 2s → 4s → 8s)
   - On 401: trigger silent token renewal, retry once
   - On 429: honor `Retry-After`, re-enqueue
   - On 5xx or network error: retry with backoff up to 5 times, then mark `syncStatus='error'`

2. **Read path (Drive → local), on app load / visibility change / interval:**
   - Fetch `transactions.json` + ETag
   - If ETag matches last-seen ETag: no-op
   - Else: per-transaction merge with local state (same rules)
   - Write merged state to IndexedDB
   - Emit `sync-updated` event → UI refreshes

3. **Multi-tab coordination (simple):**
   - Each tab runs its own sync engine, debounced 500ms after the last mutation
   - Tabs broadcast `tx-changed` events on a `BroadcastChannel('pfa')` so other tabs refresh their local UI from IndexedDB (no duplicate network fetches for UI updates)
   - When two tabs both sync at nearly the same time, one will see a 412 ETag mismatch and retry — the retry loop handles it correctly. Occasional duplicate fetches are acceptable; no leader election needed.

4. **Background sync (progressive enhancement):**
   - On supported browsers (Chrome/Android), Workbox Background Sync retries queued mutations when connectivity returns even if the tab is closed
   - On iOS and older browsers, sync resumes when the app is next opened — good enough for MVP

**Tombstone GC:**
- On each sync, any tombstone with `deletedAt` older than 90 days is dropped from the merged file
- 90 days is a conservative window; a device that's been offline longer than 90 days may resurrect deleted records on reconnect. Acceptable trade-off for an MVP.

**Sync Status UI:**
- Header badge: `✓ Synced 2s ago`, `⏳ Syncing...`, `⚠ Sync failed — Retry`, `⏸ Offline`
- Toast on first successful sync after offline recovery
- Settings page shows last sync time per device

### 4.5 Offline Mode

- App shell precached by Workbox (via `vite-plugin-pwa`)
- All feature code precached
- IndexedDB is the source of truth when offline
- Sync queue persists in IndexedDB (`syncQueue` table) so mutations survive tab close
- "Offline" badge in header when `navigator.onLine === false`

### 4.6 PWA

**Manifest (in `public/manifest.webmanifest`, generated by vite-plugin-pwa):**
```json
{
  "name": "Personal Finance",
  "short_name": "Finance",
  "id": "/personal-finance-app/",
  "start_url": "/personal-finance-app/",
  "scope": "/personal-finance-app/",
  "display": "standalone",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Install prompts:**
- Android: auto `beforeinstallprompt` → in-app install banner after 2 sessions
- iOS: "Add to Home Screen" instructions modal on first visit
- Desktop Chrome/Edge: install icon in address bar

**Update UX:**
- `vite-plugin-pwa`'s `registerSW({ onNeedRefresh })` triggers a non-blocking toast: *"A new version is ready. Reload to update."*
- User clicks → `skipWaiting` + `window.location.reload()`
- If user ignores, next navigation picks up the new SW

### 4.7 Data Export (new in v2.0)

**Goal:** Trust + portability. Users can leave Google Drive ecosystem without losing data.

**From Settings → Export:**
- **Export JSON** — downloads `transactions-YYYY-MM-DD.json` with full schema (including tombstones, metadata)
- **Export CSV** — downloads `transactions-YYYY-MM-DD.csv` with user-friendly columns (date, amount, currency, type, category, description, tags, notes); excludes tombstones by default
- **Export current view** — CSV of the currently filtered transaction list

> **Phase 2 consideration — "Export to Google Sheets" (one-way, on-demand):** A future Settings action that creates a new Google Sheet in the user's Drive populated with current transactions, for direct viewing / sharing with an accountant / pivot tables. This would be a **read-only projection** — the app continues to use `appDataFolder/transactions.json` as source of truth, and the Sheet is regenerated on demand (not kept in sync). Requires adding `drive.file` scope (incremental OAuth consent). Deliberately deferred from MVP to avoid Sheets API rate limits and row-concurrency complexity on the sync hot path. See §14.2 item 3.

### 4.8 Theming — Dark Mode (new in v2.0)

- System / Light / Dark toggle in Settings
- Defaults to System (`prefers-color-scheme`)
- Tailwind v4 `@theme` + CSS custom properties; `<html data-theme="dark">` attribute
- Shadcn components adapt automatically
- Charts respect theme via CSS variables

### 4.9 Multi-Currency & Locale (new in v2.0)

- User's default currency is determined on first run from browser locale; stored in settings
- Per-transaction currency optional in form (defaults to user's default); supports mixed-currency households
- Display via `Intl.NumberFormat(navigator.language, { style: 'currency', currency })`
- Dates via `Intl.DateTimeFormat(navigator.language, { dateStyle: 'medium' })`
- Note: Aggregations in reports assume a single display currency — conversion between currencies is NOT in MVP scope. Reports show per-currency breakdowns if the user has transactions in multiple currencies.
- String translations deferred to Phase 2 (UI labels remain English)

### 4.10 Accessibility — WCAG 2.1 AA (new in v2.0)

**Commitment level:** WCAG 2.1 AA

**Acceptance criteria:**
- All interactive elements reachable by keyboard; focus ring visible
- Tab order is logical
- All forms have visible labels AND `aria-label` where icon-only
- All color contrasts ≥ 4.5:1 for text, ≥ 3:1 for icons/borders (tested in both themes)
- Charts have `role="img"` + `aria-label` summarizing data; also a linked "view as table" alternative
- All toasts / modals trap focus correctly (shadcn dialogs do this; verify)
- No reliance on color alone (e.g., sync status uses icon + text, not just a colored dot)
- Lighthouse Accessibility score ≥ 95 on Dashboard, Transactions, Reports, Settings

---

## 5. Technical Architecture

### 5.1 Tech Stack

| Layer | Choice | Version | Rationale |
|-------|--------|---------|-----------|
| Language | TypeScript | 5.6+ | Strict mode; no `any` |
| UI Framework | React | 19 | Latest stable; includes React Compiler |
| Compiler | React Compiler | latest | Auto-memoization → less `useMemo`/`useCallback` boilerplate |
| Build tool | Vite | 6 | Fast HMR, modern ESM, GitHub Pages friendly |
| Router | React Router | 7 (data router) | File-less config, data loaders, built-in error boundaries |
| State | Zustand | 5 | Small, devtools, easy to test |
| Forms | React Hook Form | 7 | Performant uncontrolled forms |
| Validation | Zod | 3.23+ | Schema-first, shared between forms & CSV parser |
| Styling | Tailwind CSS | 4 (CSS-first) | `@import 'tailwindcss'; @theme { ... }` |
| UI components | shadcn | current | Copy-paste, accessible, dark-mode ready |
| Icons | Lucide | latest | Tree-shakeable |
| DB | Dexie | 4 | IndexedDB wrapper; reactive via `useLiveQuery` |
| CSV | papaparse | 5 | Battle-tested, streaming, small |
| OAuth | @react-oauth/google | latest | `useGoogleLogin` hook for implicit token flow |
| Charts | Recharts | 2.x (budget-permitting) | React-friendly; fallback to hand-rolled SVG if bundle is tight |
| PWA | vite-plugin-pwa | latest | Workbox-backed, manifest + SW |
| Tests (unit/integration) | Vitest | 2 | Fast, Jest-compat API |
| Tests (DOM) | @testing-library/react | latest | Accessible queries |
| Tests (E2E) | Playwright | latest | Multi-browser, network mocking |
| Lint | ESLint + typescript-eslint | latest | Strict |
| Format | Prettier | latest | Consistent |
| Package manager | pnpm | 9+ | Global convention; `packageManager` field |
| Node | 22 LTS | | Matches `side-projects` convention |

### 5.2 Project Structure — Feature-Sliced Modular Monolith

```
personal-finance-app/
├── ai/PFA-1/                          # Spec, plan, grill logs, test artifacts
├── public/
│   ├── icons/                         # PWA icons (192, 512, maskable)
│   └── 404.html                       # SPA deep-link fallback for GH Pages
├── src/
│   ├── app/                           # Cross-cutting app shell
│   │   ├── providers/                 # QueryClient, Theme, Router, ErrorBoundary
│   │   ├── routes.tsx                 # React Router data routes config
│   │   ├── shell/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Header.tsx
│   │   │   └── BottomNav.tsx          # mobile nav
│   │   └── main.tsx                   # entry point
│   │
│   ├── features/                      # ← vertical slices, the heart of FSD
│   │   ├── auth/
│   │   │   ├── api/                   # googleAuthClient.ts (GIS wrapper)
│   │   │   ├── model/                 # authStore.ts (Zustand)
│   │   │   ├── ui/                    # GoogleSignInButton.tsx, LoginPage.tsx
│   │   │   ├── lib/                   # token helpers, silent-refresh scheduler
│   │   │   └── index.ts               # PUBLIC API (only what other features may import)
│   │   │
│   │   ├── transactions/
│   │   │   ├── api/                   # local only: transactionsRepo.ts (Dexie)
│   │   │   ├── model/                 # transactionsStore.ts, useTransactions hook
│   │   │   ├── ui/                    # TransactionForm, TransactionList, TransactionCard, CSVImportDialog
│   │   │   ├── lib/                   # validators, csvParser (wraps papaparse), dedupe
│   │   │   └── index.ts
│   │   │
│   │   ├── sync/
│   │   │   ├── api/                   # googleDriveClient.ts (drive.appdata CRUD)
│   │   │   ├── model/                 # syncStore.ts (status, queue size)
│   │   │   ├── lib/                   # mergeTransactions, tombstones, syncEngine, syncQueue, broadcastCoordinator
│   │   │   ├── ui/                    # SyncBadge, SyncErrorBanner
│   │   │   └── index.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── model/                 # reportsStore.ts (date range, filter)
│   │   │   ├── lib/                   # aggregation.ts, calculations.ts (PURE)
│   │   │   ├── ui/                    # DashboardPage, ReportsPage, CategoryDonut, TrendChart, SummaryCards
│   │   │   └── index.ts
│   │   │
│   │   └── settings/
│   │       ├── model/                 # settingsStore.ts (theme, currency)
│   │       ├── lib/                   # exportJson, exportCsv
│   │       ├── ui/                    # SettingsPage, ThemeToggle, CurrencySelect, ExportButtons
│   │       └── index.ts
│   │
│   ├── shared/                        # no feature-specific code
│   │   ├── ui/                        # shadcn components, common building blocks (Button, Card, Input, Dialog, Toast, Table, Tabs)
│   │   ├── lib/
│   │   │   ├── db/                    # dexieDb.ts (schema, Dexie instance)
│   │   │   ├── format/                # currency.ts, date.ts (Intl wrappers)
│   │   │   ├── id.ts                  # UUID v7
│   │   │   ├── clock.ts               # injectable clock for tests
│   │   │   └── errors.ts              # AppError, SyncError, AuthError, ValidationError
│   │   ├── types/                     # Transaction, AuthState, SyncStatus, Settings
│   │   ├── config/                    # env.ts (VITE_* accessors), constants.ts
│   │   └── hooks/                     # useOnline, useBroadcastChannel, useInterval
│   │
│   └── index.css                      # Tailwind v4 entry + @theme tokens
│
├── tests/
│   ├── unit/                          # follows src/ feature structure
│   ├── integration/                   # Dexie + mocked Drive API
│   ├── e2e/                           # Playwright
│   └── fixtures/                      # sample CSVs, mock JSON
│
├── .github/workflows/
│   ├── ci.yml                         # pnpm install, lint, typecheck, unit + integration tests
│   └── deploy.yml                     # build + deploy to GitHub Pages
├── .env.example
├── .gitignore
├── vite.config.ts                     # Vite + React Compiler + PWA + Tailwind v4 plugin
├── vitest.config.ts
├── playwright.config.ts
├── eslint.config.js                   # flat config
├── tsconfig.json                      # strict, paths: @/* → src/*
├── package.json                       # packageManager: pnpm@9.x
├── pnpm-lock.yaml
├── CLAUDE.md                          # project conventions
└── README.md
```

**Feature boundary rules:**
- Features may only import from `shared/*` and their own files
- Features may NOT import from other features' internals — only via that feature's `index.ts`
- `app/*` is the only place where multiple features are composed (routes, shell)
- ESLint `import/no-restricted-paths` enforces these rules

### 5.3 Data Flow

```
User input (form)
    ↓
[Zod validate] — features/transactions/lib/validators.ts
    ↓
[Transactions store] — features/transactions/model/transactionsStore.ts
    ↓
[Dexie repo] — writes to IndexedDB immediately
    ↓
[UI reflects change via useLiveQuery] — instant feedback
    ↓
[Sync engine] — debounced, pulled from queue
    ↓
[Google Drive client] — fetch latest → merge → upload with ETag
    ↓
[BroadcastChannel notifies other tabs]
    ↓
[Other devices] — fetch on next load / visibility change
```

---

## 6. Data Model & Storage

### 6.1 IndexedDB Schema (Dexie 4)

**DB name:** `pfa` (short, stable)

```ts
class PfaDb extends Dexie {
  transactions!: Table<LocalTransaction, string>; // string PK = UUID
  syncQueue!: Table<SyncQueueItem, string>;
  metadata!: Table<MetadataItem, string>;

  constructor() {
    super('pfa');
    this.version(1).stores({
      // Note: no '++' prefix — string UUID primary key
      transactions: 'id, date, type, category, syncStatus, updatedAt, deletedAt',
      syncQueue: 'id, createdAt, retryCount',
      metadata: 'key',
    });
  }
}
```

Indexes support:
- `date` — date-range queries for reports
- `type` — filter expense vs income
- `category` — category breakdowns
- `syncStatus` — find pending items
- `updatedAt` — "recently modified" ordering
- `deletedAt` — filter out tombstones from UI queries

### 6.2 Google Drive JSON Structure

**Location:** `appDataFolder/transactions.json` (hidden app folder; `appDataFolder` is an alias in Drive API)

```json
{
  "schemaVersion": 1,
  "lastModified": "2026-04-10T11:30:00Z",
  "devices": [
    { "deviceId": "dev-<uuid>", "lastSyncTime": "2026-04-10T11:30:00Z", "userAgent": "iPhone Safari" }
  ],
  "transactions": [
    {
      "id": "01926f3a-...-uuid-v7",
      "date": "2026-04-04",
      "amount": 45.50,
      "currency": "USD",
      "type": "expense",
      "category": "groceries",
      "description": "Weekly shopping",
      "tags": [],
      "notes": "",
      "createdAt": "2026-04-04T10:30:00Z",
      "updatedAt": "2026-04-04T10:30:00Z",
      "deletedAt": null
    }
  ]
}
```

The `devices` array is append-on-sync and capped at 10 entries (LRU by `lastSyncTime`) to prevent unbounded growth.

**Size:** 150 tx ≈ 30KB, 1000 tx ≈ 200KB, 5000 tx ≈ 1MB. Drive `appDataFolder` quota is generous (shares with user's Drive, but our files stay well under any reasonable limit).

### 6.3 Schema Migration Strategy

- `schemaVersion` field in Drive JSON and metadata
- Dexie version bumps in `PfaDb.version(N)` with `.upgrade()` callbacks
- Client checks Drive `schemaVersion` on first read; if newer than client understands, show "Update required" banner (don't corrupt)
- Backward compat: new fields default to safe values; removed fields tolerated on read

---

## 7. Error Handling & Recovery

### 7.1 Sync Errors

| Scenario | Handling |
|----------|----------|
| 412 ETag mismatch | Fetch latest, re-merge, retry (up to 5x) |
| 401 Unauthorized | Trigger silent token renewal, retry once; on failure prompt re-sign-in |
| 403 Forbidden | Show "Permission denied" banner with "Revoke & Reconnect" CTA |
| 429 Too Many Requests | Honor `Retry-After`, re-enqueue |
| 5xx | Exponential backoff, up to 5 retries |
| Network offline | Queue persists; retry on `online` event or SW Background Sync |
| Corrupted Drive file | Show "Data integrity check failed" modal with "Restore from Local" button (upload local state, overwriting Drive) |
| `drive.appdata` quota exceeded | Extremely unlikely at MVP scale; show error with support link |

### 7.2 Data Validation Errors

| Scenario | Handling |
|----------|----------|
| Invalid CSV date | Row shown in preview with red highlight; user can skip or correct |
| Duplicate detection | "3 duplicates detected (skipped)" in preview |
| Amount > 9,999,999 | Require explicit confirm |
| Future date | Allowed (planned expenses); soft warning |
| Missing category | Default to "Other" |
| Zod schema failure | Inline form error per field |

### 7.3 UI Error States

- **Toast** for non-critical (sync retry, transient failure)
- **Inline banner** for persistent issues (auth expired, permission revoked, new version available)
- **Modal** for destructive confirmations (delete, wipe local data, overwrite Drive)
- **Error boundary** per route; friendly fallback; "Copy error details" for bug reports
- **Empty states** designed (first-time user, no transactions in range, CSV had no valid rows)

---

## 8. UI/UX Patterns

### 8.1 Design System (Tailwind v4 tokens)

**Theme tokens (CSS custom properties, themed):**
```css
@theme {
  --color-primary: oklch(0.62 0.18 255);      /* blue */
  --color-success: oklch(0.72 0.15 160);      /* green */
  --color-warning: oklch(0.78 0.14 80);       /* amber */
  --color-error:   oklch(0.65 0.22 25);       /* red */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace;
}
[data-theme="dark"] {
  /* overrides */
}
```

**Spacing:** 4px base (Tailwind default).
**Breakpoints:** sm 640 / md 768 / lg 1024 / xl 1280.

### 8.2 Key Screens

1. **Login** — Centered card, Google button, privacy tagline, "What is this?" link
2. **Dashboard** — Summary cards (income/expense/net), top categories donut, recent 10 transactions
3. **Transactions** — Filter bar (date range, category, type, search), list/table, FAB on mobile
4. **Add/Edit Form** — Modal or drawer (mobile); fields in sensible order; today + category quick-picks
5. **Reports** — Date range picker, donut, bar, trend line, stats
6. **Settings** — Theme, default currency, sign out, export JSON/CSV, last sync info, device ID, wipe local data
7. **Login-expired banner** — top of app, non-blocking
8. **Install prompt** — bottom sheet on mobile (Android), instructions modal on iOS

### 8.3 Mobile-First

- Bottom nav: Home, Transactions, Reports, Settings
- FAB for quick-add on Home + Transactions
- 48px min touch targets
- Swipe-to-delete on transaction rows (with undo toast)
- Pull-to-refresh triggers manual sync

---

## 9. Security & Privacy

### 9.1 Authentication
- OAuth 2.0 via Google Identity Services (token flow, implicit)
- Only `drive.appdata` scope requested — minimal blast radius
- Access token in-memory only (Zustand), never localStorage
- Silent renewal: when the access token is within 2 minutes of expiry, call the GIS token client again with the same config; if the user still has a Google session in the browser, a new token arrives silently. If it fails, we show a non-blocking banner asking the user to click "Sign in again".
- On tab close, the user has to sign in again. This is intentional (no refresh token without a backend). The sign-in flow is one click, so the cost is low.

### 9.2 Data Privacy
- All data in user's own Drive `appDataFolder` (hidden from Drive UI, not in search results)
- No third-party analytics, no tracking, no ads
- No backend server → no logs, no data collection
- Export path (JSON/CSV) lets users leave freely

### 9.3 Input Validation
- Client-side: Zod schemas at all boundaries
- Type safety: TypeScript strict, no `any`
- CSV: strict parsing with row-level error reporting
- Sanitize descriptions/notes before rendering (React handles by default; no `dangerouslySetInnerHTML` anywhere)

### 9.4 CSP
- Configure Content-Security-Policy via `<meta http-equiv>` (GitHub Pages can't set headers)
- Allow: `'self'`, `https://accounts.google.com`, `https://*.googleusercontent.com`, `https://www.googleapis.com`
- Disallow inline scripts/styles where possible; `unsafe-inline` allowed for shadcn styles (Tailwind v4 emits inline `<style>` for themes) — accept trade-off

### 9.5 Logging
- Never log tokens, full transaction bodies, or user-identifying info
- Errors go to `console.error` only — no external telemetry service (would violate the zero-backend hard limit)
- Users report bugs by clicking "Copy error details" in the error boundary, which puts a redacted payload on the clipboard they can paste into a GitHub issue

---

## 10. Testing Strategy — Pragmatic TDD at Boundaries

### 10.1 TDD Scope (pragmatic, boundary-focused)

**Strict red → green → refactor for the parts where correctness matters most:**
- Merge / tombstone logic (`features/sync/lib/mergeTransactions.ts`) — this is the highest-risk code in the app
- CSV parse + validate + dedupe (`features/transactions/lib/csv*.ts`)
- Aggregation + calculations (`features/reports/lib/*.ts`)
- Validators (`features/transactions/lib/validators.ts`)
- Currency / date formatters (`shared/lib/format/*.ts`)

**Integration tests (can be written after or alongside impl):**
- Dexie repo with `fake-indexeddb`
- Sync engine with a mocked Drive client
- CSV import flow end-to-end

**Store tests:** plain unit tests of action → state transitions. Not strictly TDD — write whichever order is natural.

**E2E (Playwright) with a mocked `window.google`:**
- Login → empty state
- Add / edit / delete transaction
- CSV import preview + dedupe
- Offline → add → online → sync
- Dark mode toggle
- Export JSON/CSV (downloads land in expected format)
- Keyboard-only nav through critical flows

**Skip tests for:** purely presentational components, shadcn wrappers, route config, theme tokens. Integration + E2E covers their real behavior.

**The discipline:** when you're about to write logic that could be wrong (sync merge, CSV edge cases, aggregation), start with a failing test. When you're wiring existing pieces together or styling a form, just write the code — integration/E2E will catch mistakes.

### 10.2 Auth in Tests

- **Unit tests:** mock `@react-oauth/google` completely
- **E2E tests:** stub `window.google` before app loads; inject a fake token flow; never hit real Google

### 10.3 Coverage Targets

- `features/*/lib/` → **95%+**
- `features/*/model/` (stores) → **90%+**
- `features/*/api/` → **85%+** (with mocked I/O)
- `features/*/ui/` → **60%+** (focus on conditional render logic; not every click)
- `shared/lib/` → **100%** (pure code)
- Enforced in CI via Vitest coverage thresholds

### 10.4 Test Data Fixtures

- `tests/fixtures/sample-transactions.json` — 100 realistic multi-currency, multi-category transactions
- `tests/fixtures/bank-*.csv` — different bank CSV formats (US format, EU format, Indian format, quoted fields, BOM, CRLF)
- `tests/fixtures/malformed.csv` — various invalid rows for error-path tests

---

## 11. Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| FCP (dashboard, cold) | < 2s on 4G | After SW precache, subsequent loads < 500ms |
| TTI | < 3s | React Compiler should help |
| Add transaction | < 100ms | IndexedDB + Zustand |
| Sync round-trip | < 3s for ≤ 500 tx | Measured end-to-end |
| CSV import (1000 rows) | < 2s | papaparse streams; batch inserts |
| Bundle size (initial) | **< 250KB gzipped** | Tighter than v1.0's 400KB |
| Bundle size (total) | < 500KB gzipped | Code-split reports + settings |
| Lighthouse Performance | ≥ 95 | Enforced in CI via Lighthouse CI |
| Lighthouse Accessibility | ≥ 95 | Enforced in CI |
| Lighthouse Best Practices | ≥ 95 | Enforced in CI |
| Lighthouse PWA | 100 | Installable, offline, manifest |

**Enforcement:** `.github/workflows/ci.yml` runs `size-limit` on bundle + Lighthouse CI on a preview build. CI fails if thresholds regress.

**Optimization levers:**
- Code-split reports & settings via lazy routes
- Dynamic import papaparse (only loaded on CSV import)
- Dynamic import charting library
- Tree-shake lucide-react (named imports)
- Tailwind v4 JIT keeps CSS tiny
- Service Worker caches fonts & icons

---

## 12. Deployment — GitHub Pages (Subpath)

### 12.1 Target URL

- Production: `https://<github-user>.github.io/personal-finance-app/`
- (Future) Custom domain: `finance.<yourdomain>.com` (with CNAME file)

### 12.2 Vite Config Requirements

```ts
// vite.config.ts
export default defineConfig({
  base: '/personal-finance-app/',
  plugins: [
    react({ /* React Compiler enabled */ }),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: { navigateFallback: '/personal-finance-app/index.html' },
      manifest: { /* ... start_url, scope set to base */ },
    }),
  ],
});
```

### 12.3 SPA Deep-Link Fallback

- `public/404.html` duplicates `index.html` with a small script that rewrites the URL from `404` → real route
- GitHub Pages serves `404.html` for unknown paths → SPA catches and routes client-side
- Alternative: use `HashRouter` (simpler but uglier URLs) — **rejected** for UX reasons

### 12.4 GitHub Actions

- `.github/workflows/ci.yml` — runs on every PR: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` (headless), Lighthouse CI
- `.github/workflows/deploy.yml` — runs on push to `main`: build + `actions/upload-pages-artifact` + `actions/deploy-pages`
- Uses `GITHUB_TOKEN` — no secrets needed for deployment itself
- Environment variables (`VITE_GOOGLE_CLIENT_ID`) injected from GitHub Secrets at build time

### 12.5 Portability

- Keep everything deploy-agnostic enough that moving to Cloudflare Pages / Netlify / Vercel / custom S3+CloudFront is a 1-hour job: change `base`, change CI artifact upload, update OAuth authorized origins.

---

## 13. Google Cloud / OAuth Setup

The plan includes a task that walks through this, but spec'd here for reference:

1. Create a Google Cloud project: `personal-finance-app`
2. Enable **Google Drive API** (only Drive, no other services)
3. Configure OAuth consent screen:
   - User type: External (for personal use, keep in Testing mode — max 100 test users)
   - App name, support email, developer contact
   - **Scopes:** `.../auth/drive.appdata` ONLY
   - Test users: your Google account
4. Create OAuth 2.0 Client ID (Web application):
   - **Authorized JavaScript origins:**
     - `http://localhost:5173` (dev)
     - `https://<github-user>.github.io` (prod — origin only, no subpath)
   - **Authorized redirect URIs:** not needed for implicit token flow
5. Copy Client ID → `VITE_GOOGLE_CLIENT_ID` in `.env.local` and GitHub repo secret
6. Record Client ID in CLAUDE.md (public info) and the grill log for traceability

**Verification requirement:** Because we only use `drive.appdata`, which is a **non-sensitive** scope in Google's classification, no verification or brand review is needed for personal use. If you later publish to non-test-users, you'll need to publish the consent screen but no verification is required for this narrow scope.

---

## 14. Scalability & Future Growth

### 14.1 Current MVP Constraints
- Single user per Google account
- Up to ~5000 transactions comfortably (can grow with pagination)
- No real-time collaboration

### 14.2 Phase 2+ Roadmap (non-breaking)

1. **Recurring transactions** — add `recurrence?: RecurrenceRule` to schema; generator service
2. **Budgets** — new `budgets` object store + metadata file
3. **Export to Google Sheets (one-way projection)** — Settings action that creates a new Sheet in the user's Drive, populated with current transactions via Sheets API `values.batchUpdate`. Read-only mirror for viewing / sharing with an accountant / custom pivot tables. **App continues to use `appDataFolder/transactions.json` as source of truth**; the Sheet is regenerated on demand, NOT kept in sync. Requires incremental OAuth consent for `drive.file` scope. Deferred from MVP because (a) Sheets API rate limits (60 req/min/user) would strain the sync hot path, (b) cell type coercion adds escape/unescape complexity, and (c) the Sheet would be visible in the user's Drive (not hidden like `appdata`) — making it a Phase 2 opt-in feature is the right tradeoff.
4. **Receipts** — upload images to `appDataFolder/receipts/`; reference by ID
5. **Capacitor wrapper** — iOS/Android native apps; **MUST use native OAuth plugin, not WebView**
6. **Shared/family** — separate shared folder; requires light backend for conflict votes (moves away from zero-backend)
7. **Translations** — add react-i18next; start with `en` + `bn`
8. **Forecasting & ML insights** — Phase 2B
9. **Tax exports** — category-based filing summaries
10. **Micro-frontend extraction** — if the app grows, features are already isolated enough to extract into Module Federation remotes

---

## 15. Acceptance Criteria (MVP Done When...)

**Auth**
- [ ] User can sign in with Google in < 2 seconds on broadband
- [ ] Signing in requests only `drive.appdata` scope
- [ ] Silent token renewal works for at least one expiry cycle without user intervention

**Data & Sync**
- [ ] Add/edit/delete transaction reflects in UI in < 100ms
- [ ] Transaction syncs to Drive `appDataFolder` within 5s on good network
- [ ] Two devices signed into the same account see each other's changes within one manual refresh cycle
- [ ] Concurrent edits on two devices do NOT lose data (per-tx merge verified by E2E test)
- [ ] Deletes on one device remain deleted on another (tombstone test passes)
- [ ] Offline add → online → auto-sync works without user action

**Import/Export**
- [ ] CSV import supports at least 3 date formats (ISO, US, EU)
- [ ] CSV import detects duplicates and skips them
- [ ] Export JSON downloads a valid file matching schema
- [ ] Export CSV downloads a spreadsheet-friendly file

**Reports**
- [ ] Dashboard shows summary + top categories + recent transactions
- [ ] Reports page shows donut, trend, and stats for selected range
- [ ] Switching date range recomputes in < 300ms

**PWA & Offline**
- [ ] App installs as PWA on Android Chrome and desktop Chrome/Edge
- [ ] App launches offline after first visit
- [ ] All core operations work offline

**Theme & Locale**
- [ ] Dark mode toggle works; persists across reloads
- [ ] Amounts display with locale-correct currency formatting
- [ ] Dates display in locale format

**Deployment**
- [ ] CI passes on every PR (lint, typecheck, unit, integration, build)
- [ ] Deploy workflow publishes to GitHub Pages on push to `main`
- [ ] Deployed app loads without 404s on deep links

**Quality**
- [ ] Lighthouse Performance / Accessibility / Best Practices / PWA ≥ 95 / 95 / 95 / 100
- [ ] Bundle < 250KB gzipped (initial), < 500KB total
- [ ] Test coverage meets thresholds (95%/90%/85%/60%/100%)
- [ ] Zero console errors in production build
- [ ] Zero TypeScript `any`

---

## 16. Known Limitations & Trade-Offs

| Limitation | Why | Phase 2 Solution |
|-----------|-----|-----------------|
| Single user per account | Simpler sync, no collab | Shared `appDataFolder` alt, conflict votes |
| Last-write-wins per field | Simpler than CRDT | Field-level CRDT (overkill for MVP) |
| 90-day tombstone GC window | Balance between storage and correctness | Per-device sync vector clocks (Phase 2) |
| No cross-currency conversion | Requires external FX API | Offline-cached FX rates, daily refresh |
| English UI only | Time-to-market | react-i18next with en + bn |
| Access token re-sign-in on tab close | No refresh token without backend | Optional backend session (breaks zero-backend) |
| No real-time multi-device updates | Polling only | Drive webhook requires backend |
| iOS PWA OAuth quirks | Apple | Native Capacitor wrapper |

---

## 17. Change Log

| Version | Date | Change | Author |
|---------|------|--------|--------|
| 1.0 | 2026-04-04 | Initial MVP spec | Claude Code |
| 2.0 | 2026-04-10 | Grill-log fixes: `drive.appdata` scope, per-tx merge + tombstones + ETag concurrency, feature-sliced modular monolith, React 19 + Tailwind v4 + pnpm + current shadcn + vite-plugin-pwa, pragmatic TDD at boundaries, dark mode, multi-currency + locale formatting, JSON/CSV export, GitHub Pages subpath deployment, Google Cloud OAuth setup walkthrough, WCAG 2.1 AA commitment, doc layout migrated to `ai/PFA-1/`. Applied simplicity mandate: explicit "Zero Backend — Hard Limit" and "Simple Over Clever" principles with rules-out list; dropped multi-tab leader election in favor of per-tab debounce with tolerated duplicate fetches via BroadcastChannel; inlined `metadata.json` into `transactions.json` with devices array capped at 10; committed to Recharts with React.lazy on Reports page (no hand-rolled hedge); removed Sentry/external telemetry in favor of `console.error` + "Copy error details"; simplified silent OAuth token renewal; reframed testing as pragmatic TDD only on high-risk pure logic with integration/E2E elsewhere. Added Phase 2 roadmap item: one-way "Export to Google Sheets" projection (evaluated Sheets API as primary store and rejected on complexity/rate-limit grounds). | Claude Code |

---

## Appendix A: Why Not [Alternative]?

**`drive.file` instead of `drive.appdata`?**
- `drive.file` only grants access to files the current OAuth session created or opened; on a new device, the app can't find existing files. Broken cross-device. → Use `drive.appdata`.

**ID token instead of access token?**
- ID tokens are for proving identity (OIDC), not for calling Drive API. Calls will be rejected. → Use access token via GIS implicit flow.

**Whole-file LWW instead of per-tx merge?**
- Loses data on concurrent edits. → Per-tx merge + ETag.

**Hard delete instead of tombstones?**
- Deleted records resurrect on sync from a device that edited them before the delete. → Soft delete + delete-wins merge.

**Flat layer-based structure?**
- Feature boundaries get fuzzy as the app grows. → Feature-sliced.

**Redux Toolkit instead of Zustand?**
- More boilerplate, more concepts; RTK's main value (RTK Query) is for server state, which we barely have. → Zustand.

**Custom service worker instead of vite-plugin-pwa?**
- Reinventing Workbox. → vite-plugin-pwa.

**Custom CSV parser instead of papaparse?**
- CSV edge cases are numerous (quoted commas, BOM, CRLF, encodings). → papaparse.

**`HashRouter` for GitHub Pages?**
- Ugly URLs, SEO bad. → `BrowserRouter` + `404.html` fallback.

**CRDT instead of LWW?**
- Overkill for single-user multi-device. → LWW per field, tombstone per record.

---

## Appendix B: Glossary

- **appDataFolder:** Special hidden folder in a user's Google Drive, accessible only to the app that created it (via `drive.appdata` scope). Cross-device consistent for the same OAuth client ID.
- **ETag:** HTTP header used for optimistic concurrency control; Drive returns one per file revision.
- **FSD:** Feature-Sliced Design — architectural pattern organizing code by vertical slices (features) rather than horizontal layers.
- **GIS:** Google Identity Services — the modern OAuth 2.0 client library replacing gapi.auth2.
- **LWW:** Last-Write-Wins — conflict resolution by keeping the record with the latest timestamp.
- **PWA:** Progressive Web App — installable, offline-capable web app with native-like shell.
- **TDD:** Test-Driven Development — write failing test, make it pass, refactor.
- **Tombstone:** A deleted-but-retained record marker, used to propagate deletions through sync.
- **UUID v7:** Time-ordered UUIDs (2021 spec), better for database indexing than v4.
