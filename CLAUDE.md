# Personal Finance App — Project Guide

Zero-backend personal finance PWA. Single-user transaction tracker that syncs to the user's own Google Drive (hidden app folder) so their data is theirs and there's no server to run.

**Status:** Pre-implementation. Spec and plan finalized; code scaffolding begins with Phase 0.

**Canonical documents (read these first):**
- `ai/PFA-1/requirements/spec.md` — v2.0 specification (source of truth for what)
- `ai/PFA-1/plans/plan.md` — v2.0 implementation plan (source of truth for how/when)
- `ai/PFA-1/requirements/grill-log.md` — rejected alternatives and why

If anything in this file conflicts with the spec or plan, **the spec and plan win** — update this file to match.

---

## Architecture at a glance

```
Browser (PWA)
 ├── IndexedDB (Dexie 4)        ← source of truth on device
 │    ├── transactions          ← includes tombstones (soft-deleted)
 │    ├── syncQueue             ← pending sync ops, survives tab close
 │    └── metadata              ← settings, lastSyncAt, deviceId
 │
 ├── Service Worker (Workbox)   ← offline precache, background sync
 │
 └── Google Drive API v3        ← transactions.json in appDataFolder
      └── appDataFolder/
           └── transactions.json  ← single file, ETag for concurrency
```

**No server. Ever.** Not serverless, not edge, not "just a proxy." If a feature needs a backend, it's out of MVP scope. See spec §2 principle 0.

**Source of truth:** IndexedDB locally + `transactions.json` in Drive remotely. The app reconciles them via a pure **merge function** (`src/features/sync/model/merge.ts`) on every sync.

---

## Tech stack (locked in — do not change without grilling first)

| Layer | Choice | Why not something else |
|------|--------|------------------------|
| Runtime | React 19 | Stable by 2026; React Compiler obviates most `useMemo` |
| Build | Vite 6 | Fastest; first-class PWA plugin; native ESM |
| Package manager | pnpm 9+ | Mandated by `/side-projects/CLAUDE.md` global convention |
| Language | TypeScript 5, strict | `noUncheckedIndexedAccess` on; zero `any` |
| Styling | Tailwind v4 (CSS-first) | `@theme` tokens + CSS variables; shadcn adapts automatically |
| UI primitives | `shadcn` (current package, not `shadcn-ui`) | Copy-in components; full ownership |
| State | Zustand 5 | Simpler than Redux; no provider hell |
| Forms | react-hook-form + Zod | RHF is fastest; Zod resolver for schema reuse |
| Storage | Dexie 4 (IndexedDB) | Typed, promise-based, migration support |
| Sync | Google Drive REST v3, `drive.appdata` scope | Hidden from user's Drive; cross-device consistent |
| Auth | Google Identity Services (GIS) token flow | **Not** `@react-oauth/google` (ID token ≠ access token) |
| CSV | papaparse 5 | RFC-4180 compliant |
| Charts | Recharts 2 (lazy-loaded) | Committed per spec §4.3 |
| Testing | Vitest 2 + RTL + fake-indexeddb + MSW + Playwright | Pragmatic TDD at boundaries |
| PWA | vite-plugin-pwa (Workbox) | Don't hand-roll SWs |
| Deployment | GitHub Pages subpath `/personal-finance-app/` | Free, stable, matches other side-projects |

**Rejected alternatives** (and why — details in grill log):
- npm or yarn → pnpm global convention
- React 18 → we want React 19 compiler
- Tailwind v3 → v4 CSS-first is cleaner
- Custom SW → vite-plugin-pwa is audited
- `@react-oauth/google` → uses ID token, we need access token for Drive API
- `drive.file` scope → files not exposed across devices for app-created-elsewhere
- Whole-file LWW → loses concurrent edits; per-tx merge required
- Google Sheets as primary store → rate limits + concurrency complexity; see spec §14.2 item 3
- Sentry / external telemetry → zero backend principle; use `console.error` + "Copy error details"
- Multi-tab leader election → per-tab debounce with tolerated duplicate fetches is simpler

---

## Project structure (Feature-Sliced Modular Monolith)

```
src/
├── app/               # providers, routing, shell
├── features/
│   ├── auth/          # GIS token client, sign-in UI, auth store
│   ├── transactions/  # CRUD, CSV import/export, form, list, filters
│   ├── sync/          # drive client, merge, sync queue, tombstone GC
│   ├── reports/       # aggregators, charts, dashboard tile
│   └── settings/      # theme, locale, export, sign-out
└── shared/
    ├── types/         # Transaction, Sync, Settings, Result<T,E>
    ├── lib/           # id, money, date, locale (pure)
    ├── validation/    # Zod schemas
    ├── db/            # Dexie schema + AppDb
    ├── config/        # env, constants
    ├── constants/     # error messages (NO inline strings)
    └── test-fixtures/ # shared test data
```

**Rules:**
1. **Features own their entire vertical slice.** `api/`, `model/`, `ui/`, `lib/`, and `tests/` all live inside the feature folder.
2. **Features import from `shared/` only** — never from a sibling feature.
3. **Each feature exposes a single `index.ts`** as its public API. Internals are private.
4. **Shared is the kernel.** If three features need it, it goes in `shared/`. If two do, inline or use a domain event.

**Absolute imports only** (`@/shared/...`, `@/features/auth/...`). Never relative imports (`../../`).

---

## Development commands

```bash
# Setup
pnpm install
cp .env.example .env.local  # fill in VITE_GOOGLE_CLIENT_ID

# Dev loop
pnpm dev                     # http://localhost:5173/personal-finance-app/
pnpm test                    # vitest watch mode
pnpm test:run                # vitest single run with coverage
pnpm exec playwright test    # e2e
pnpm lint
pnpm typecheck
pnpm build                   # → dist/
pnpm preview                 # serve dist locally

# Before committing
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

**Node version:** 22 (see `.nvmrc`).

---

## OAuth setup (one-time, per developer)

Follow spec §13 for the full walkthrough. Summary:

1. Google Cloud Console → new project
2. Enable **Google Drive API**
3. OAuth consent screen → User type: External, Testing mode
4. Scopes → add `https://www.googleapis.com/auth/drive.appdata` **only**
5. Credentials → Create OAuth 2.0 Client ID → Web application
6. Authorized JavaScript origins:
   - `http://localhost:5173` (dev)
   - `https://encryptioner.github.io` (prod)
7. Copy the client ID into `.env.local` as `VITE_GOOGLE_CLIENT_ID=...`
8. For production: add the same value to the GitHub repo secret `VITE_GOOGLE_CLIENT_ID`

**Never commit `.env.local`.** It's in `.gitignore`.

---

## Data model (critical — reference spec §6)

### Transaction
```ts
interface Transaction {
  id: string;             // UUID v7 (time-sortable)
  type: 'income' | 'expense' | 'transfer';
  amount: number;         // INTEGER minor units (cents) — never floats
  currency: string;       // ISO 4217, e.g. 'USD', 'BDT'
  date: string;           // ISO 8601 'YYYY-MM-DD'
  category: string;
  description?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;      // ISO 8601 datetime
  updatedAt: string;      // ISO 8601 datetime — LWW key for sync
  deletedAt?: string;     // tombstone; presence means deleted
  deviceId: string;       // tiebreaker for LWW conflicts
}
```

**Amount storage rule:** integer minor units (e.g., $12.34 stored as `1234`). Float math is banned — use `formatCurrency(amount, currency)` at the display edge.

### Drive file (`appDataFolder/transactions.json`)
```jsonc
{
  "schemaVersion": 1,
  "lastModified": "2026-04-10T12:00:00Z",
  "devices": [
    { "id": "d_abc", "lastSeen": "2026-04-10T12:00:00Z", "userAgent": "..." }
  ],                       // capped at 10; LRU eviction
  "transactions": [ /* Transaction[] with tombstones */ ]
}
```

---

## Sync model (critical — reference spec §4.4)

- **Scope:** `drive.appdata` — hidden app folder, cross-device consistent
- **Merge:** per-transaction, LWW per record, tiebroken by `deviceId` lexicographic
- **Concurrency:** ETag on the Drive file; `If-Match` header on PATCH; 412 → re-read, re-merge, retry (max 5, exponential backoff)
- **Deletes:** tombstones (`deletedAt`), not hard deletes. GC after 90 days.
- **Multi-tab:** each tab syncs independently with 500ms debounce. Tabs coordinate UI refresh via `BroadcastChannel('pfa-sync')`. Occasional duplicate fetches are tolerated — simpler than leader election.
- **Offline:** ops queue in Dexie `syncQueue` store; drain on `online` event and on successful sign-in.

**Do not:**
- Implement leader election across tabs (explicit non-goal)
- Use ID tokens for Drive API calls (wrong token type)
- Store tokens in `localStorage` (XSS risk — use sessionStorage or memory)
- Cache `googleapis.com` responses in the Service Worker (NetworkOnly per spec §4.6)

---

## Testing philosophy (pragmatic TDD at boundaries)

**Strict red-green-refactor** for:
- `features/sync/model/merge.ts` — highest-risk file; property-based tests (commutativity, associativity, idempotence)
- `features/transactions/api/duplicate-detector.ts`
- `features/transactions/api/csv-parser.ts` + `csv-column-mapper.ts` + `csv-exporter.ts`
- `features/reports/model/aggregators.ts`
- `features/auth/model/token-state-machine.ts`
- All `shared/lib/**` and `shared/validation/**`

**Integration-first** for:
- `features/*/api/**` (repositories, Drive client) — test against fake-indexeddb / MSW
- Sync service orchestration

**Test-alongside** for:
- UI components (RTL)
- Zustand stores (pragmatic, don't test Zustand internals)

**E2E gate** (Playwright) for:
- Every user flow in spec §15 Acceptance Criteria
- Offline scenarios
- Sync conflict scenarios
- Accessibility (`@axe-core/playwright` on every spec)

**Coverage thresholds** (enforced in `vitest.config.ts`):
- `shared/lib/**`, `shared/validation/**`: **95%**
- `features/*/api/**`, `features/*/model/**`: **90%**
- `features/*/ui/**`: **85%**
- `features/*/lib/**`: **80%**

---

## Code rules (project-specific — also see `~/.claude/rules/*`)

1. **No `any`, ever.** If a third-party lib has weak types, write a narrow wrapper in `shared/lib/`.
2. **No relative imports.** Use `@/` alias.
3. **No inline error messages.** All user-facing and domain error strings come from `src/shared/constants/messages.ts`.
4. **No floats for money.** Integer minor units only.
5. **No `localStorage` for tokens.** Memory + `sessionStorage` only.
6. **No domain logic in UI components.** UI reads from stores, calls actions — no repository calls directly.
7. **No new dependencies without justification** in the PR description.
8. **No skipping hooks.** `--no-verify` is forbidden (global rule).
9. **Dexie `lean()` not applicable** but: use projections/select where IndexedDB supports them; never load unneeded fields.
10. **Never query inside loops.** Use bulk operations (Dexie `bulkPut`, `bulkGet`).

---

## Workflow (matches `~/.claude/CLAUDE.md` ticket-based flow)

- All work for this project happens under ticket **PFA-1**
- Documents live in `ai/PFA-1/{requirements,plans,tests}/`
- Branches: `PFA-1/main/v2/<slice>` — e.g., `PFA-1/main/v2/shared-kernel`
- One phase from the plan = one PR (ideally) with a conventional-commits checkpoint message
- Every PR must pass CI (`lint + typecheck + test + build`) before merge
- Deploys happen automatically on push to `main` via GitHub Actions

**Mid-implementation drift:** if a phase reveals a spec gap, stop, note it in `ai/PFA-1/requirements/grill-log.md`, update spec §17 Change Log, then resume.

---

## Known limitations (deferred to Phase 2+)

- No cross-currency conversion (requires FX API)
- No real-time multi-device updates (would need webhooks → backend)
- iOS PWA OAuth has quirks — Capacitor wrapper is the fix
- English UI only — react-i18next is Phase 2
- Single user per Google account — shared accounts need a different sync model
- No recurring transactions, budgets, receipts, forecasting — all Phase 2+

See spec §16 for the full list and §14.2 for the Phase 2+ roadmap.

---

## When to consult what

| Question | Read |
|---------|------|
| "What should this feature do?" | `ai/PFA-1/requirements/spec.md` |
| "What order should I build in?" | `ai/PFA-1/plans/plan.md` |
| "Why not Sheets API / why not refresh tokens / why not leader election?" | `ai/PFA-1/requirements/grill-log.md` + spec §2 rules-out list |
| "What's the commit/branch convention?" | `~/.claude/rules/git-workflow.md` |
| "What Node version?" | `.nvmrc` (22) |
| "How do I set up OAuth locally?" | spec §13 + this file's "OAuth setup" section |
| "Is X on the roadmap?" | spec §14.2 |
| "How do I run the tests?" | Commands section above |
