# Personal Finance PWA — Implementation Plan (v2.0)

**Ticket:** PFA-1
**Plan Version:** 2.0
**Date:** 2026-04-10
**Status:** Ready for Implementation
**Supersedes:** `plans/2026-04-04-personal-finance-pwa-implementation.md` (v1.0)
**Spec:** `ai/PFA-1/requirements/spec.md` (v2.0)
**Grill log:** `ai/PFA-1/requirements/grill-log.md`

---

## 0. How to Use This Plan

This plan turns the v2.0 spec into a concrete, phase-by-phase build order. Each phase is a **vertical slice** that ends at a green CI checkpoint and a well-formed commit. Phases are sequenced so each one can stand on its own — meaning you could stop after any phase and still have a working, testable artifact.

**Reading conventions:**

- **Goal** — one-sentence outcome
- **Depends on** — which earlier phases must be done
- **TDD mode** — one of:
  - **Strict (red → green → refactor)** — write failing test first, watch it fail, implement minimum, refactor. Use for pure logic where correctness is non-negotiable.
  - **Integration-first** — write integration test, then implement. Use at I/O boundaries.
  - **Test-alongside** — write code and tests together. Use for UI components and glue.
  - **E2E gate** — ship behind a Playwright flow test.
- **Files to create** — concrete paths inside the project root
- **Tasks** — ordered steps; TDD steps are marked `🔴 test first` / `🟢 implement` / `🔵 refactor`
- **Acceptance** — how you know the phase is done (maps to spec §15)
- **Checkpoint commit** — what the conventional-commits message should look like

**Non-goals for this plan:**
- Time estimates (per user preference)
- Assigning work to humans (solo project)
- Writing actual test code (that happens in the phase)

**Hard rules across all phases:**
1. No phase is "done" until CI is green and coverage thresholds hold (spec §10.3).
2. Every commit must pass `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
3. Never introduce `any`. Never use relative imports (`../../`). Use `@/` alias.
4. Zero backend. If a phase seems to need a server, stop and escalate.
5. Keep the bundle under budget (spec §11). Use `pnpm build` with `rollup-plugin-visualizer` when tempted to add a large dep.

---

## 1. Phase Map (at a glance)

| # | Phase | TDD Mode | Depends on | Unlocks |
|---|-------|---------|-----------|---------|
| 0 | Foundations (tooling, CI, path aliases) | Test-alongside | — | everything |
| 1 | Shared Kernel (types, Dexie, Zod, Intl, fixtures) | Strict on pure | 0 | all feature slices |
| 2 | Transactions — Local Only (CRUD + validation) | Strict on services | 1 | CSV, sync, reports |
| 3 | CSV Import / Export | Strict on parsing | 2 | user data portability |
| 4 | Auth — GIS Token Client | Integration-first | 1 | sync |
| 5 | Sync — Drive `appdata` + per-tx merge | Strict on merge | 2, 4 | multi-device MVP |
| 6 | Reports — Aggregation + Recharts | Strict on aggregation | 2 | dashboard done |
| 7 | Settings — Theme, Locale, Export, Sign-out | Test-alongside | 2, 3, 4 | polish |
| 8 | PWA — Workbox, Offline, Install | E2E gate | 0, 5 | offline story |
| 9 | Deployment — GitHub Pages CI/CD | E2E gate | 0, 8 | shipping |
| 10 | Accessibility + Final Polish | E2E gate (axe) | 2–9 | done |

**Why this order:**

The spec's highest-risk logic is the **per-transaction merge function** in Phase 5. But to write that function with confidence, you need a solid domain model first. So we build:

1. Types and storage (Phase 1) →
2. The whole transaction CRUD flow *locally* with strict TDD (Phase 2) — no auth, no network, full confidence in the data layer →
3. CSV import to stress-test the schema with real-world messy data (Phase 3) →
4. **Only then** introduce auth (Phase 4) and sync (Phase 5).

This means by the time we're writing the merge function, the Transaction shape has been hammered on by hundreds of tests and we're not chasing two moving targets.

---

## 2. Phase 0 — Foundations

### Goal
Scaffold a pnpm + Vite 6 + React 19 + TypeScript strict project that builds, lints, type-checks, tests, and deploys a "Hello PFA" page to a dev URL.

### Depends on
Nothing. Fresh project.

### TDD mode
**Test-alongside.** Phase 0 is tooling, not logic. Write one smoke test to prove Vitest works; write one Playwright test to prove the E2E rig works.

### Files to create

```
personal-finance-app/
├── .github/workflows/
│   ├── ci.yml                       # lint + typecheck + test + build on PR
│   └── deploy.yml                   # build + deploy to gh-pages on main
├── .gitignore
├── .nvmrc                           # node 22
├── .editorconfig
├── .prettierrc.json
├── .prettierignore
├── eslint.config.js                 # flat config, react + a11y + prettier plugins
├── index.html                       # Vite entry, <div id="root">, CSP meta tag
├── package.json                     # packageManager: pnpm@9.x
├── pnpm-lock.yaml                   # generated
├── tsconfig.json                    # strict, paths @/*
├── tsconfig.node.json               # for vite.config.ts
├── vite.config.ts                   # base, alias, plugins, test config
├── vitest.config.ts
├── playwright.config.ts             # baseURL: http://localhost:5173/personal-finance-app
├── src/
│   ├── main.tsx                     # React 19 createRoot
│   ├── App.tsx                      # placeholder Hello PFA
│   ├── index.css                    # Tailwind v4 @theme + base layer
│   ├── vite-env.d.ts
│   └── __tests__/
│       └── smoke.test.ts            # 1 + 1 === 2, proves vitest loads
├── e2e/
│   └── smoke.spec.ts                # visits / and checks <h1>
├── CLAUDE.md                        # project-level instructions (Task #3)
└── README.md                        # basic dev instructions
```

### Tasks (ordered)

0. `git init && git checkout -b main` — must exist before any commits. [M5]

1. `pnpm init` → set `"packageManager": "pnpm@9.x"` (use current installed version) and `"type": "module"`, `"engines": { "node": ">=22" }`.
2. Install runtime deps: `react@19 react-dom@19`.
3. Install dev deps:
   - Build: `vite@6 @vitejs/plugin-react typescript@5 vite-plugin-pwa workbox-window`
   - Lint/format: `eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y prettier eslint-config-prettier` — **`eslint-config-prettier` required** to prevent ESLint/Prettier conflicts [C2]
   - Test: `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8`
   - E2E: `@playwright/test`
   - Style: `tailwindcss @tailwindcss/vite` — **no PostCSS, no autoprefixer, no tailwind.config** [C1]
   - Bundle analysis: `rollup-plugin-visualizer` [m3]
4. Write `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, `paths: { "@/*": ["./src/*"] }`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`.
5. Write `vite.config.ts`:
   - `base: '/personal-finance-app/'` (spec §12.1)
   - `resolve.alias: { '@': path.resolve(__dirname, './src') }`
   - `plugins: [react(), tailwindcss(), VitePWA({ injectRegister: 'auto', registerType: 'prompt' })]`
     — `tailwindcss` imported from `@tailwindcss/vite`. No PostCSS config needed. [C1]
   - `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`
   - Bundle analysis: add `visualizer({ open: false })` when `process.env.VISUALIZE === 'true'` [m3]
6. Write `src/index.css` with `@import "tailwindcss"` and `@theme { ... }` block for color tokens (spec §8.1).
7. Write `index.html` with CSP meta tag (spec §9.4) [M4]:
   ```html
   <meta http-equiv="Content-Security-Policy" content="
     default-src 'self';
     script-src 'self' https://accounts.google.com;
     connect-src 'self' https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com;
     frame-src https://accounts.google.com;
     img-src 'self' data: https://lh3.googleusercontent.com;
     style-src 'self' 'unsafe-inline';
   ">
   ```
   Note: `'unsafe-inline'` for styles required by Tailwind v4/shadcn CSS variable injection. Revisit in Phase 10 if removable.
8. Write `src/App.tsx` returning `<h1 className="text-2xl font-bold">Personal Finance App</h1>`.
9. Write `playwright.config.ts` with `use: { baseURL: 'http://localhost:5173/personal-finance-app' }` — all `page.goto('/')` calls resolve to the correct base. [m2]
10. Write `eslint.config.js` extending `...prettier` as the **last** element so it disables conflicting style rules. [C2]
11. 🔴 Write `src/__tests__/smoke.test.ts`: `expect(1 + 1).toBe(2)`. Run `pnpm test` — should pass.
12. 🔴 Write `e2e/smoke.spec.ts`: `page.goto('/')` (resolves to base URL), expect heading. Run `pnpm exec playwright test` against `pnpm dev`.
13. Write `.github/workflows/ci.yml`: checkout → setup pnpm → install → lint → typecheck → test → build. Matrix on `node: [22]`.
14. Write `.github/workflows/deploy.yml`: skeleton (full deployment Phase 9).
15. Add `.gitignore`, `README.md`.
16. Initial commit: `chore(init): scaffold pfa project`. Push to GitHub, enable Pages in repository settings.

### Acceptance
- [ ] `pnpm install` runs clean
- [ ] `pnpm dev` serves the app at `http://localhost:5173/personal-finance-app/` (note base path)
- [ ] `pnpm build` produces `dist/` with correct asset paths
- [ ] `pnpm test` passes smoke test
- [ ] `pnpm exec playwright test` passes smoke spec
- [ ] `pnpm lint` and `pnpm typecheck` pass
- [ ] CI green on the first PR

### Checkpoint commit
```
feat(foundations): scaffold vite 6 + react 19 + tailwind v4 + vitest + playwright

Establishes the build, test, and lint toolchain per spec §5.1. Adds GitHub
Actions CI that runs on every PR. Deploy workflow is scaffolded but the
Pages target is wired up in phase 9.
```

---

## 3. Phase 1 — Shared Kernel

### Goal
Build the foundational types, storage, validation, and formatting utilities that every feature slice will import. No UI, no features, just the kernel.

### Depends on
Phase 0.

### TDD mode
**Strict red-green-refactor** for pure functions (formatters, validators, ID generators). **Integration-first** for Dexie setup (test against fake-indexeddb).

### Files to create

```
src/
├── shared/
│   ├── types/
│   │   ├── transaction.ts           # Transaction interface, Category enum
│   │   ├── sync.ts                  # SyncStatus, SyncQueueEntry, Tombstone
│   │   ├── settings.ts              # UserSettings interface
│   │   ├── result.ts                # Result<T, E> helper type
│   │   └── index.ts                 # barrel export
│   ├── lib/
│   │   ├── id.ts                    # uuidv7() wrapper (see below)
│   │   ├── id.test.ts               # 🔴 strict TDD
│   │   ├── money.ts                 # formatCurrency(), parseMoney()
│   │   ├── money.test.ts            # 🔴 strict TDD
│   │   ├── date.ts                  # formatDate(), parseDate(), toISODate()
│   │   ├── date.test.ts             # 🔴 strict TDD
│   │   ├── locale.ts                # resolveDefaultLocale(), getUserCurrency()
│   │   └── locale.test.ts           # 🔴 strict TDD
│   ├── validation/
│   │   ├── transaction-schema.ts    # Zod schema matching Transaction type
│   │   ├── transaction-schema.test.ts
│   │   ├── settings-schema.ts
│   │   └── settings-schema.test.ts
│   ├── db/
│   │   ├── schema.ts                # Dexie v1 schema definition
│   │   ├── db.ts                    # export const db = new AppDb()
│   │   ├── db.test.ts               # fake-indexeddb integration test
│   │   └── migrations/              # empty for v1, placeholder for future
│   ├── config/
│   │   └── env.ts                   # typed import.meta.env wrapper
│   └── test-fixtures/
│       ├── transactions.ts          # sample transactions for all tests
│       └── index.ts
├── test/
│   └── setup.ts                     # jest-dom, fake-indexeddb import
```

### New dependencies
- `dexie@4` — IndexedDB wrapper
- `zod@3` — schema validation
- `uuid@10` or write a tiny UUID v7 helper (UUID v7 is time-sortable, unlike v4)
- Dev: `fake-indexeddb` — for Dexie tests

### Tasks (ordered)

**Types first (no tests — types don't execute)**
1. Write `src/shared/types/transaction.ts`:
   ```ts
   export type TransactionType = 'income' | 'expense' | 'transfer';
   export interface Transaction {
     id: string;             // UUID v7
     type: TransactionType;
     amount: number;         // integer minor units — no floats! (USD: cents ×100; JPY: ×1; KWD: fils ×1000). Use getDecimalPlaces(currency) to scale.
     currency: string;       // ISO 4217, e.g. 'USD', 'BDT'
     date: string;           // ISO 8601 YYYY-MM-DD
     category: string;
     description?: string;
     tags?: string[];
     notes?: string;
     createdAt: string;      // ISO 8601 datetime
     updatedAt: string;      // ISO 8601 datetime
     deletedAt?: string;     // tombstone (spec §4.4)
     deviceId: string;       // which device last edited
   }
   ```
   > **Key decision:** store money as integer minor units (cents) to avoid float drift. Format at the edge via `formatCurrency(amount, currency)`.

2. Write `src/shared/types/sync.ts`:
   ```ts
   export type SyncStatus = 'idle' | 'queued' | 'syncing' | 'synced' | 'error';
   export interface SyncQueueEntry { id: string; txId: string; op: 'upsert' | 'delete'; createdAt: string; retryCount: number; lastError?: string; }
   ```

3. Write `src/shared/types/settings.ts`, `result.ts`, and the barrel.

**Pure libs — STRICT TDD**

4. `src/shared/lib/id.ts` — UUID v7 helper.
   - 🔴 Write `id.test.ts` first with assertions: "generates string", "two calls produce different IDs", "IDs are lexicographically increasing when generated in sequence".
   - 🟢 Implement using `uuid` package's `v7()`.
   - 🔵 Refactor: wrap so we can stub in tests.

5. `src/shared/lib/money.ts` — `getDecimalPlaces(currency)`, `formatCurrency(minorUnits, currency, locale)`, `parseMoney(input, currency)`. [M1]
   - `getDecimalPlaces(currency: string): number` — lookup table: JPY/KRW/VND/etc. → 0, KWD/BHD/OMR → 3, default → 2. All money operations use this; never assume "÷100".
   - 🔴 Tests:
     - `formatCurrency(1234, 'USD')` → `"$12.34"`
     - `formatCurrency(1234, 'JPY')` → `"¥1,234"` (no division — JPY has 0 decimal places)
     - `formatCurrency(12345, 'KWD')` → `"KD 12.345"` (3 decimal places)
     - `parseMoney("$12.34", "USD")` → `1234`
     - `parseMoney("¥1234", "JPY")` → `1234` (not 123400)
     - `parseMoney("abc", "USD")` → error result
   - 🟢 Implement with `Intl.NumberFormat`. Use `getDecimalPlaces` to scale correctly.
   - 🔵 Refactor: extract separator detection helper if regex gets ugly.

6. `src/shared/lib/date.ts` — `toISODate(Date)`, `parseDate(string, hint?)`, `formatDate(iso, locale)`.
   - 🔴 Tests: `toISODate(new Date('2026-04-10'))` → `'2026-04-10'`, `parseDate('04/10/2026', 'US')` → `'2026-04-10'`, `parseDate('10/04/2026', 'EU')` → `'2026-04-10'`, `parseDate('2026-04-10')` → `'2026-04-10'`.
   - 🟢 Implement without pulling in date-fns unless bundle budget allows (spec §11). Prefer native `Intl.DateTimeFormat` for display.
   - 🔵 Refactor common regex patterns.

7. `src/shared/lib/locale.ts` — `resolveDefaultLocale()` from `navigator.language`, `getUserCurrency(locale)` from region → currency map.
   - 🔴 Tests: `en-US` → `USD`, `en-GB` → `GBP`, `bn-BD` → `BDT`, `de-DE` → `EUR`, unknown fallback → `USD`.

**Validation — STRICT TDD**

8. `src/shared/validation/transaction-schema.ts` — Zod schema that exactly matches `Transaction` type.
   - 🔴 Tests: valid fixture parses; missing `amount` fails with message from constants; negative amount on income fails; future date beyond 1 year fails; invalid currency code fails.
   - 🟢 Implement schema.
   - 🔵 Extract error message constants to `shared/constants/messages.ts` (per user's typescript-general rule).

**Storage — INTEGRATION-FIRST**

9. `src/shared/db/schema.ts` — Dexie v1 schema matching spec §6.1 (transactions, syncQueue, metadata stores with exact indexes).
10. `src/shared/db/db.ts` — `AppDb` class extending `Dexie`.
11. `src/shared/db/db.test.ts` — uses `fake-indexeddb` to test:
    - DB opens at version 1
    - Can put/get a transaction
    - Indexes exist (query by `type`, by `updatedAt`, by `deletedAt`)
    - `syncQueue` isolated from `transactions`
12. Add `fake-indexeddb/auto` to `src/test/setup.ts`.

**Fixtures**

13. `src/shared/test-fixtures/transactions.ts` — export `makeTransaction(overrides?)` factory + named fixtures like `groceries`, `paycheck`, `rent`. Every feature slice will import these.

### Acceptance
- [ ] All pure functions have strict red-green-refactor history (visible in commits)
- [ ] Dexie integration test passes against fake-indexeddb
- [ ] `pnpm test` shows ≥ 30 passing tests in the shared kernel
- [ ] Coverage for `shared/lib` and `shared/validation` ≥ 95% (spec §10.3)
- [ ] Zero `any` in shared kernel
- [ ] All error messages come from a constants module, not inline strings

### Checkpoint commit
```
feat(shared): add kernel types, dexie schema, zod validators, intl helpers

Establishes the shared kernel that all feature slices will import:
transaction/sync/settings types, IndexedDB schema v1 via Dexie 4, Zod
schemas for validation, locale-aware formatters, UUID v7 IDs, and test
fixtures. All pure logic built strictly test-first.
```

---

## 4. Phase 2 — Transactions Slice (Local Only)

### Goal
End-to-end transaction CRUD working **entirely against IndexedDB** — no auth, no network, no sync. A user could open the app, add/edit/delete transactions, filter/sort them, and everything persists across reloads. This is the heart of the product.

### Depends on
Phase 1.

### TDD mode
**Strict red-green-refactor** for the service layer (pure functions operating on the DB). **Test-alongside** for UI components.

### Files to create

```
src/features/transactions/
├── api/
│   ├── transaction-repository.ts         # Dexie wrapper: list, get, upsert, softDelete, findByIdRange
│   ├── transaction-repository.test.ts    # integration test w/ fake-indexeddb
│   ├── duplicate-detector.ts             # pure fn
│   └── duplicate-detector.test.ts        # 🔴 strict TDD
├── model/
│   ├── transaction-store.ts              # Zustand store: list, filters, selection, crud actions
│   ├── transaction-store.test.ts         # slice tests (not strict TDD — store is glue)
│   ├── filters.ts                        # applyFilters() pure fn
│   ├── filters.test.ts                   # 🔴 strict TDD
│   ├── sorters.ts                        # sortTransactions() pure fn
│   └── sorters.test.ts                   # 🔴 strict TDD
├── ui/
│   ├── TransactionListPage.tsx
│   ├── TransactionListPage.test.tsx      # RTL component test
│   ├── TransactionRow.tsx
│   ├── TransactionForm.tsx               # RHF + Zod
│   ├── TransactionForm.test.tsx          # RTL w/ user-event
│   ├── FilterBar.tsx
│   ├── EmptyState.tsx
│   └── DeleteConfirmDialog.tsx
├── lib/
│   ├── categories.ts                     # default category list
│   └── transaction-events.ts             # domain events (for sync to subscribe later)
└── index.ts                              # public API: { TransactionListPage, useTransactionStore }
```

### New dependencies
- `zustand@5` — state management
- `react-hook-form@7` + `@hookform/resolvers` — forms
- `react-router-dom@7` — **committed, not optional**. 15KB gzipped, within budget [C5]
- `shadcn` CLI — primitives via init + add

### Tasks (ordered)

**Repository — INTEGRATION-FIRST**

1. `transaction-repository.ts`:
   - `list(filters?)` — returns non-deleted transactions, applies filters at DB level where possible
   - `get(id)` — single transaction
   - `upsert(tx)` — set `updatedAt` to now, `createdAt` to now if new
   - `softDelete(id)` — sets `deletedAt`, does NOT remove row (tombstone)
   - `hardDelete(id)` — for Phase 5 tombstone GC only; not exposed in UI
2. `transaction-repository.test.ts` — for each method, test against fake-indexeddb with realistic fixtures.

**Duplicate detection — STRICT TDD** (critical for CSV import in Phase 3)

3. 🔴 Write `duplicate-detector.test.ts` first:
   - Two transactions with same date, amount, currency, type, category → duplicate
   - Same date but different amount → not duplicate
   - Same everything but description differs → configurable (probably not a dup)
   - Empty list → never finds duplicates
   - Performance: 1000 existing × 100 new runs in < 200ms (perf test)
4. 🟢 Implement with a hash key: `${date}|${amount}|${currency}|${type}|${category}`.
5. 🔵 Refactor: extract key builder.

**Filters & Sorters — STRICT TDD**

6. 🔴 `filters.test.ts`: filter by date range, by type, by category, by text search in description, combined filters.
7. 🟢 Implement `applyFilters(list, criteria)`.
8. 🔴 `sorters.test.ts`: sort by date asc/desc, amount asc/desc, stable sort behavior.
9. 🟢 Implement `sortTransactions(list, sortKey, direction)`.

**Store — TEST-ALONGSIDE**

10. `transaction-store.ts` — Zustand store with:
    - `transactions: Transaction[]` (cached list for UI)
    - `filters, sort` state
    - Actions: `load()`, `add(input)`, `edit(id, patch)`, `remove(id)`, `setFilters(f)`, `setSort(s)`
    - Under the hood: calls repository, then `transaction-events.emit()` (stub for Phase 5 sync)
11. `transaction-store.test.ts` — pragmatic tests: "after add, list contains new tx"; "after remove, list excludes it"; don't test Zustand internals.

**UI — TEST-ALONGSIDE**

12. Init shadcn **before** adding components [C3]:
    ```bash
    pnpm dlx shadcn@latest init
    # choose: style=new-york, base color=neutral, CSS variables=yes, TypeScript=yes
    ```
    Commit the generated `components.json`. shadcn detects Tailwind v4 automatically.
13. Add shadcn primitives: `pnpm dlx shadcn@latest add button dialog input select form table toast`.
14. Wire routing with `react-router-dom@7` [C5]:
    ```tsx
    // src/app/router.tsx
    import { createBrowserRouter } from 'react-router-dom';
    export const router = createBrowserRouter(routes, {
      basename: import.meta.env.BASE_URL,  // '/personal-finance-app/' in prod, '/' in test
    });
    ```
    `import.meta.env.BASE_URL` = Vite's `base` config. Works in dev + prod without hardcoding.
15. `TransactionListPage.tsx` — container: `FilterBar`, `TransactionListTable`, `EmptyState`, "+ Add" FAB.
16. `TransactionForm.tsx` — RHF + Zod resolver → `transaction-schema`. Errors from Zod/constants.
17. `TransactionListPage.test.tsx` — happy path RTL test.
18. `TransactionForm.test.tsx` — validation errors render via `aria-describedby`.

**E2E gate**

18. `e2e/transactions.spec.ts`:
    - Sign-in is mocked (no Google yet; use a localStorage flag for now)
    - Add transaction → see row
    - Edit transaction → see updated amount
    - Delete transaction → row disappears
    - Reload page → transactions persist

### Acceptance (maps to spec §15 Data & Sync, Import/Export partial)
- [ ] Can add/edit/delete transactions via UI
- [ ] Deletions are soft (row has `deletedAt`, not actually gone from DB)
- [ ] Filters work (date range, type, category, text)
- [ ] Sort works (date, amount)
- [ ] Data persists across reload (IndexedDB)
- [ ] Service layer coverage ≥ 95%
- [ ] UI component coverage ≥ 85%
- [ ] Transaction form is keyboard-navigable with visible focus ring
- [ ] Add/edit/delete reflects in UI in < 100ms (spec §11)

### Checkpoint commit
```
feat(transactions): add local-only CRUD with dexie + zustand + rhf/zod

Users can add, edit, soft-delete, filter, and sort transactions. All data
persists in IndexedDB. No auth or sync yet — this slice is intentionally
offline-only so the domain logic is battle-tested before sync lands.
```

---

## 5. Phase 3 — CSV Import / Export

### Goal
Users can import transactions from bank CSVs (with column mapping) and export their current list to JSON or CSV. This proves the Transaction schema survives real-world data.

### Depends on
Phase 2.

### TDD mode
**Strict red-green-refactor** for CSV parsing, column inference, and export formatting. **Test-alongside** for the import wizard UI.

### Files to create

```
src/features/transactions/
├── api/
│   ├── csv-parser.ts                     # papaparse wrapper + type coercion
│   ├── csv-parser.test.ts                # 🔴 strict TDD
│   ├── csv-column-mapper.ts              # infer column → field
│   ├── csv-column-mapper.test.ts         # 🔴 strict TDD
│   ├── csv-exporter.ts                   # transactions → CSV string
│   ├── csv-exporter.test.ts              # 🔴 strict TDD
│   ├── json-exporter.ts                  # transactions → JSON string
│   └── json-exporter.test.ts             # 🔴 strict TDD
├── ui/
│   ├── ImportWizard.tsx                  # 3-step: upload → map → confirm
│   ├── ImportWizard.test.tsx
│   ├── ColumnMappingStep.tsx
│   └── ImportPreviewStep.tsx
└── lib/
    └── date-format-detection.ts          # sniff ISO vs US vs EU
```

### New dependencies
- `papaparse@5` + `@types/papaparse`

### Tasks (ordered)

**CSV parsing — STRICT TDD**

1. 🔴 `csv-parser.test.ts`:
   - Parses a minimal 3-row file with headers
   - Handles quoted values with commas
   - Handles BOM
   - Handles CRLF vs LF
   - Rejects files > 10MB (don't even try — stream in Phase 2+ if needed)
   - Returns `Result<ParsedRow[], ParseError>`
2. 🟢 Implement with `Papa.parse(file, { header: true, skipEmptyLines: true })`.
3. 🔵 Refactor error messages to constants.

**Column mapping — STRICT TDD**

4. 🔴 `csv-column-mapper.test.ts`:
   - Headers `Date, Amount, Description` → auto-map date/amount/description
   - Headers in different order → still maps correctly
   - Headers `Transaction Date, Debit, Credit, Memo` → date → Transaction Date, description → Memo, amount derived from Debit (negative) / Credit (positive)
   - Unknown headers → user must manually map
5. 🟢 Implement with synonym dictionary only (no Levenshtein — over-engineering per "simple over clever"). Unknown headers → user maps manually. Add fuzzy match later if real-world CSVs prove the dictionary insufficient.

**Date format detection — STRICT TDD**

6. 🔴 `date-format-detection.ts.test.ts`:
   - All values match `YYYY-MM-DD` → ISO
   - All values match `MM/DD/YYYY` and max month > 12 is impossible → US
   - Values where first number > 12 exists → EU (DD/MM/YYYY)
   - Mixed → return `ambiguous`
7. 🟢 Implement heuristic.

**Exporters — STRICT TDD**

8. 🔴 `csv-exporter.test.ts`:
   - Round-trip: export → parse → matches original (modulo tombstones being excluded)
   - CSV is RFC 4180 compliant (proper quoting)
   - Includes header row
   - Tombstones excluded from CSV by default
9. 🟢 Implement with `Papa.unparse()`.
10. 🔴 `json-exporter.test.ts`: valid JSON, includes tombstones, includes schema version.
11. 🟢 Implement simple `JSON.stringify(payload, null, 2)`.

**Import wizard UI**

12. `ImportWizard.tsx` — three steps, state via local `useReducer`:
    - Step 1: file upload (drag-drop + input)
    - Step 2: column mapping with live preview of first 5 rows
    - Step 3: confirm — shows "Will import N rows, skip M duplicates"
13. On confirm: loops via `transaction-store.add()` — which uses repository which uses duplicate detector.
14. `ImportWizard.test.tsx`: full flow with a sample CSV fixture.

### Acceptance
- [ ] CSV import supports ≥ 3 date formats (spec §15 Import/Export)
- [ ] CSV import detects duplicates and skips them
- [ ] Export JSON produces a valid file matching schema
- [ ] Export CSV produces a spreadsheet-friendly file
- [ ] CSV 1000-row parse completes in < 2s (spec §11)
- [ ] No `any` leaks from papaparse

### Checkpoint commit
```
feat(transactions): add csv import with column mapping and json/csv export

Import wizard handles column detection, date format inference (ISO/US/EU),
and duplicate skipping. Exports produce RFC-4180 CSVs and pretty-printed
JSON. Parser coverage 95%+.
```

---

## 6. Phase 4 — Auth Slice (GIS Token Client)

### Goal
Sign-in is **optional**. App opens directly to the Dashboard without any auth gate. A persistent "sign in to sync" prompt appears for unsigned users. Once signed in, the session persists via GIS silent re-auth on every app load — user never needs to sign in again unless they explicitly sign out. **No actual Drive calls yet** — that's Phase 5.

### Depends on
Phase 1 (for settings store).

### TDD mode
**Integration-first.** Auth is mostly I/O. Pure logic (token state machine, expiry math) gets strict TDD.

### Files to create

```
src/features/auth/
├── api/
│   ├── gis-client.ts                     # wraps window.google.accounts.oauth2
│   ├── gis-client.test.ts                # mocked window.google
│   ├── token-storage.ts                  # session-scoped token holder
│   └── token-storage.test.ts
├── model/
│   ├── auth-store.ts                     # Zustand: status, profile, token, actions
│   ├── auth-store.test.ts
│   ├── token-state-machine.ts            # pure: given(now, expiry), what state?
│   └── token-state-machine.test.ts       # 🔴 strict TDD
├── ui/
│   ├── SignInPage.tsx
│   ├── SignInPage.test.tsx
│   ├── SignInButton.tsx
│   ├── ProfileMenu.tsx
│   └── SignOutConfirm.tsx
└── lib/
    └── google-scripts-loader.ts          # appendScript with promise
```

### New dependencies
- None runtime — GIS is loaded from `https://accounts.google.com/gsi/client` via a script tag.
- Dev: nothing new.

### Tasks (ordered)

**Token state machine — STRICT TDD** (this is the one piece of pure logic)

1. 🔴 `token-state-machine.test.ts`:
   - `state(now, expiresAt)` where `expiresAt - now > 5min` → `'valid'`
   - `expiresAt - now <= 5min && > 0` → `'expiring'` (schedule silent renew)
   - `expiresAt - now <= 0` → `'expired'`
   - no token → `'unauthenticated'`
2. 🟢 Implement as `getTokenState({ now, expiresAt, hasToken })`.
3. 🔵 Extract thresholds to constants.

**GIS client — INTEGRATION-FIRST**

4. `google-scripts-loader.ts` — appends the GIS script tag once, resolves when loaded. Tested via jsdom + promise mock.
5. `gis-client.ts`:
   - `initTokenClient({ clientId, scope, callback })` → returns a `tokenClient` ref
   - `requestAccessToken()` → triggers the consent flow or silent refresh
   - `revoke(token)` → calls `google.accounts.oauth2.revoke`
6. `gis-client.test.ts` — mock `window.google.accounts.oauth2` and assert the right methods are called with the right args.

**Token storage (in-memory + sessionStorage)**

7. `token-storage.ts`:
   - **Never** store tokens in `localStorage` (XSS risk per spec §9.2)
   - Keep the access token in a module-level variable; mirror `expiresAt` to `sessionStorage` so a tab-internal reload can resume
   - Expose `getToken()`, `setToken(token, expiresAt)`, `clear()`
8. Tests for each method.

**Auth store — TEST-ALONGSIDE**

9. `auth-store.ts` — Zustand with:
   - `status: 'idle' | 'signing-in' | 'authenticated' | 'error'`
   - `profile: { email, name, picture } | null`
   - `signIn()` — kicks off GIS flow with UI popup (`prompt: 'consent'`), sets token on callback, fetches profile
   - `silentSignIn()` — attempts GIS silent re-auth (`prompt: ''`) on app load; if succeeds, sets token; if fails, stays `'idle'` (no error shown to user — normal for first visit or signed-out state)
   - `signOut()` — revokes token, clears store
   - `ensureFreshToken()` — called before any Drive API call; if `expiring`, triggers silent renew
10. Tests: mocks `gis-client`, asserts state transitions and token storage calls.

**UI** (no login gate — app opens to Dashboard)

11. Remove any login-gate route. Dashboard is the `/` route, always accessible.
12. `SignInBanner.tsx` — soft prompt in header for unauthenticated users: *"Sign in with Google to sync across devices"* + dismiss button. Shown only when `status === 'idle'`.
13. `SignInButton.tsx` — standalone sign-in button used in banner and Settings page.
14. `ProfileMenu.tsx` — avatar button when authenticated; dropdown with email, "Sign out".
15. Component tests with RTL.

**Env wiring**

14. `src/shared/config/env.ts`:
    ```ts
    export const env = {
      googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
    };
    if (!env.googleClientId) throw new Error('VITE_GOOGLE_CLIENT_ID is required');
    ```
15. Create `.env.example` with `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`.
16. **Follow spec §13** to set up the Google Cloud project, enable Drive API, create OAuth client for `http://localhost:5173` + eventual `https://encryptioner.github.io`, and put the client ID in `.env.local`. This is a manual step — document it in the PR description.

**E2E gate**

17. `e2e/auth.spec.ts` with mocked GIS:
    - Visit `/`
    - Click "Sign in with Google"
    - Mocked GIS fires callback with fake token
    - Expect redirect to Dashboard

### Acceptance (spec §15 Auth)
- [ ] App opens directly to Dashboard without any sign-in prompt
- [ ] Unsigned users see a dismissible "Sign in to sync" banner in header
- [ ] User can sign in with Google (against real consent in dev)
- [ ] Scope requested is exactly `drive.appdata` — no more, no less
- [ ] Access token lives in memory only, never localStorage
- [ ] Silent re-auth on app load restores signed-in state without any UI
- [ ] Token state machine 100% coverage
- [ ] Silent renew fires automatically in the "expiring" state
- [ ] Sign out revokes the token and clears all state

### Checkpoint commit
```
feat(auth): optional sign-in with gis silent re-auth and drive.appdata scope

App no longer requires sign-in to use. GIS silent re-auth on load restores
sessions persistently. Tokens in memory only. Token state machine built
strictly test-first. Unsigned users see dismissible sync prompt in header.
```

---

## 7. Phase 5 — Sync Slice (Drive `appdata` + Per-Transaction Merge)

### Goal
Transactions sync bidirectionally to a single `transactions.json` file in the user's Drive `appDataFolder`, using per-transaction merge (LWW per record), ETag concurrency, and tombstones. Multi-tab coordinated via BroadcastChannel. Offline queue survives tab close.

### Depends on
Phases 2 (transactions) and 4 (auth).

### TDD mode
**Strict red-green-refactor** for the merge function — this is the highest-risk pure logic in the app. **Integration-first** for the Drive client. **E2E gate** for the full sync flow.

### Files to create

```
src/features/sync/
├── api/
│   ├── drive-client.ts                   # fetch wrapper for Drive REST v3
│   ├── drive-client.test.ts              # MSW mocked
│   ├── drive-file-manager.ts             # find/create/read/write transactions.json
│   ├── drive-file-manager.test.ts
│   └── errors.ts                         # DriveError, ConflictError, RateLimitError
├── model/
│   ├── sync-store.ts                     # Zustand: status, lastSyncAt, queueLen, error
│   ├── sync-store.test.ts
│   ├── merge.ts                          # pure: mergeTransactions(local, remote)
│   ├── merge.test.ts                     # 🔴 STRICT TDD — highest risk file in app
│   ├── sync-queue.ts                     # enqueue/dequeue/retry logic
│   ├── sync-queue.test.ts                # 🔴 strict TDD
│   └── tombstone-gc.ts                   # 90-day GC of deleted records
│   └── tombstone-gc.test.ts              # 🔴 strict TDD
├── services/
│   ├── sync-service.ts                   # orchestrator: "run a sync now"
│   ├── sync-service.test.ts              # integration with mocked drive-client
│   ├── broadcast-channel.ts              # wraps BroadcastChannel('pfa-sync')
│   └── broadcast-channel.test.ts
├── ui/
│   ├── SyncStatusBadge.tsx               # shows idle/syncing/error
│   └── SyncErrorDialog.tsx               # "Sync failed — retry / details"
└── lib/
    └── device-id.ts                      # localStorage-backed device identifier — localStorage is CORRECT here (not a security credential; must persist across sessions for stable device identity)
```

### New dependencies
- Dev: `msw@2` — for mocking fetch in Drive client tests

### Tasks (ordered)

**The merge function — STRICT TDD** (spend the most time here)

1. 🔴 `merge.test.ts` — write these tests BEFORE any implementation. Treat this file like a contract:

   - **Empty cases:**
     - `merge([], [])` → `[]`
     - `merge([tx1], [])` → `[tx1]`
     - `merge([], [tx1])` → `[tx1]`
   - **Non-conflicting union:**
     - `merge([tx1], [tx2])` → `[tx1, tx2]` (distinct IDs)
   - **Same ID, different updatedAt:**
     - local `updatedAt: '2026-04-10T12:00:00Z'`, remote `updatedAt: '2026-04-10T13:00:00Z'` → remote wins
     - opposite → local wins
   - **Same ID, identical updatedAt (tie-break):**
     - Tie-break deterministically by `deviceId` lexicographic order (consistent across devices)
   - **Tombstones:**
     - local deleted at 12:00, remote updated at 11:00 → deletion wins
     - local deleted at 12:00, remote updated at 13:00 → undelete wins (edit beat delete because remote is newer)
     - Both deleted → deleted; `deletedAt` is max
   - **Tombstone GC:**
     - Tombstones older than 90 days are NOT returned from merge (spec §4.4 — rely on `tombstone-gc.ts` for that though; merge itself just merges)
   - **Property-based test (fast-check optional):**
     - `merge(a, b)` equals `merge(b, a)` → commutativity
     - `merge(merge(a, b), c)` equals `merge(a, merge(b, c))` → associativity
     - `merge(a, a)` equals `a` → idempotence
   - **Performance:**
     - 5000 local × 5000 remote merges in < 50ms

2. 🟢 Implement `mergeTransactions(local, remote)` as a pure function.
3. 🔵 Refactor: extract tiebreaker, LWW, tombstone-aware compare into small helpers.

> **Critical:** if any test in this file ever fails after passing once, stop everything and debug. This function is the sync correctness backbone.

**Sync queue — STRICT TDD**

4. 🔴 `sync-queue.test.ts`: enqueue upsert/delete ops, dequeue in FIFO, exponential backoff on retry, cap retries at 5, survives restart (persisted in Dexie).
5. 🟢 Implement as a thin wrapper over the Dexie `syncQueue` store.

**Tombstone GC — STRICT TDD**

6. 🔴 `tombstone-gc.test.ts`: given a list with tombstones of various ages, return only those older than 90 days. Safe to call with no tombstones.
7. 🟢 Implement `findStaleTombstones(list, now, maxAgeDays)`.

**Drive client — INTEGRATION-FIRST**

8. `drive-client.ts` — thin wrapper around `fetch`:
   - `list(q)` — GET `/drive/v3/files?spaces=appDataFolder&q=...`
   - `get(fileId)` — GET `/drive/v3/files/{id}?alt=media` — returns body + ETag header
   - `create(metadata, body)` — POST multipart upload
   - `update(fileId, body, ifMatchETag)` — PATCH with `If-Match` header (optimistic concurrency)
   - Always calls `authStore.ensureFreshToken()` first
9. `drive-client.test.ts` — use MSW to mock `googleapis.com` endpoints:
   - 200 → parsed response
   - 401 → throws `UnauthorizedError` (triggers silent renew, one retry, then bubble)
   - 412 Precondition Failed → throws `ConflictError` (caller retries after fresh read)
   - 429/500 → throws `RateLimitError` → exponential backoff retry (max 5)

**File manager — INTEGRATION-FIRST**

10. `drive-file-manager.ts`:
    - `findOrCreateTransactionsFile()` [M2]:
      - List `appDataFolder` for `name='transactions.json'`
      - If 0 results → create with empty `{ schemaVersion: 1, devices: [], transactions: [] }`
      - If 1 result → return that fileId
      - **If > 1 result (race condition — two devices did first-sync simultaneously):** merge all files' transaction arrays via `mergeTransactions()`, write merged result to the first file, delete the rest, return first fileId. Add this branch to tests.
    - `readTransactionsFile()` → `{ body, etag }`
      - Note: Google Drive ETags are quoted strings (`"abc123"` not `abc123`). Pass verbatim to `If-Match`.
    - `writeTransactionsFile(body, etag)` → new etag, 412-safe
11. Test against MSW with realistic responses. Include a test for the multiple-files-found branch.

**Sync service — ORCHESTRATOR**

12. `sync-service.ts` [M3, N1]:
    ```ts
    const CURRENT_SCHEMA_VERSION = 1;  // from shared/config/constants.ts

    export async function runSync(retryCount = 0): Promise<SyncResult> {
      if (retryCount >= 5) throw new MaxRetriesError('Sync failed after 5 attempts');

      const local = await transactionRepository.listAll();  // includes tombstones
      const { body: remote, etag } = await driveFileManager.readTransactionsFile();

      // Schema guard — don't corrupt a newer app's file [M3]
      if (remote.schemaVersion > CURRENT_SCHEMA_VERSION) {
        throw new UnsupportedSchemaError(
          `Remote schema v${remote.schemaVersion} — update this app to sync`
        );
      }

      const merged = mergeTransactions(local, remote.transactions);
      const nextBody = { ...remote, transactions: merged, lastModified: nowIso(), devices: trackDevice(remote.devices) };
      try {
        await driveFileManager.writeTransactionsFile(nextBody, etag);
        await transactionRepository.bulkReplace(merged);
        broadcastChannel.postMessage({ type: 'sync-complete', at: nowIso() });
        return { ok: true, mergedCount: merged.length };
      } catch (e) {
        if (e instanceof ConflictError) {
          // 412: re-read remote, re-merge, retry — single retry counter [N1]
          await sleep(exponentialBackoff(retryCount));
          return runSync(retryCount + 1);
        }
        throw e;
      }
    }
    ```
    After max retries or non-412 error: push error to `sync-store` and surface in UI via `SyncErrorDialog`.
14. Integration test: mocked drive-client + real merge function + real repository (fake-indexeddb).

**Multi-tab coordination**

15. `broadcast-channel.ts` — wraps `new BroadcastChannel('pfa-sync')`. Messages:
    - `{ type: 'sync-complete', at }`
    - `{ type: 'transaction-changed', txId }`
16. On receiving `sync-complete`, other tabs call `transactionStore.reload()` (refresh UI from DB).
17. Debounced sync: each tab debounces its own sync call by 1000ms. Tolerate the rare duplicate fetch — simpler than leader election (spec §4.4).

**Wire auto-sync triggers (spec §4.4)**

18. In `sync-service.ts`, export `initAutoSync()` — called once on app boot when user is authenticated:
    ```ts
    export function initAutoSync() {
      // Trigger 1: mutation-driven (debounced 1s)
      transactionStore.subscribe(() => {
        if (authStore.isAuthenticated()) debouncedSync();
      });

      // Trigger 2: online event — drains queue immediately
      window.addEventListener('online', () => {
        if (authStore.isAuthenticated()) void runSync();
      });

      // Trigger 3: visibility change — pull-check only (push only if pending)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && authStore.isAuthenticated()) {
          void runSync();
        }
      });
    }
    ```
    Called from `auth-store.ts` after successful sign-in (and after silent re-auth on load).
19. `SyncButton.tsx` — always visible in header (even when not signed in, but disabled with tooltip "Sign in to sync"). Shows:
    - ✓ green "Synced" + last sync time
    - ⏳ animated "Syncing…"
    - 🔴 "Sync failed" + retry action
    - ⏸ grey "Offline" (when `!navigator.onLine`)
    - ⏳ badge count of pending unsynced changes

**UI**

20. `SyncButton.tsx` replaces the old `SyncStatusBadge` — it IS the button AND the status indicator.
21. `SyncErrorDialog.tsx` — on error, shows message + "Retry" + "Copy error details" (for bug reports — per spec §9.5, no external telemetry).

**E2E gate**

21. `e2e/sync.spec.ts` — full flow with mocked GIS + mocked Drive via route interception:
    - Sign in
    - Add transaction A
    - Wait for sync → Drive file contains A
    - Simulate second device: modify Drive file to contain A + B
    - Force sync → local now contains A + B
    - Delete A locally → Drive file contains tombstone for A
22. `e2e/sync-conflict.spec.ts` — 412 retry path: first write fails, second succeeds.

### Acceptance (spec §15 Data & Sync)
- [ ] Merge function has 100% coverage and passes property-based tests
- [ ] Two concurrent devices' changes merge without data loss (E2E verified)
- [ ] Deletes stay deleted across devices (tombstone E2E verified)
- [ ] Offline add → online → auto-sync works without user action
- [ ] 412 conflict retries automatically up to 5 times
- [ ] Token renewal happens transparently mid-sync
- [ ] No token in localStorage or logs

### Checkpoint commit
```
feat(sync): add drive appdata sync with per-tx merge, etag, tombstones

Implements multi-device sync per spec §4.4. Merge function is pure and
built strictly test-first with commutativity/associativity/idempotence
property tests. ETag-based optimistic concurrency with 412 retry loop.
Tombstones carry delete semantics across devices. Multi-tab coordinated
via BroadcastChannel + 500ms debounce — no leader election, tolerate
rare duplicate fetches per "simple over clever".
```

---

## 8. Phase 6 — Reports Slice (Aggregation + Recharts)

### Goal
Dashboard tile + dedicated Reports page with donut (categories), trend (monthly), and summary stats. Aggregation is a pure function. Recharts is lazy-loaded.

### Depends on
Phase 2.

### TDD mode
**Strict red-green-refactor** for aggregation. **Test-alongside** for chart components (chart libs are notoriously hard to unit test — focus on data binding, not pixels).

### Files to create

```
src/features/reports/
├── model/
│   ├── aggregators.ts                    # pure fns: byCategory, byMonth, summary
│   ├── aggregators.test.ts               # 🔴 strict TDD
│   ├── date-ranges.ts                    # "last 30 days", "this year", etc.
│   └── date-ranges.test.ts               # 🔴 strict TDD
├── ui/
│   ├── DashboardTile.tsx                 # small summary for main dashboard
│   ├── ReportsPage.tsx                   # React.lazy target
│   ├── CategoryDonut.tsx                 # wraps Recharts PieChart
│   ├── MonthlyTrendChart.tsx             # wraps Recharts LineChart
│   ├── StatsGrid.tsx                     # text tiles: total income, total expense, net
│   └── DateRangePicker.tsx
└── lib/
    └── chart-theme.ts                    # maps CSS vars to Recharts theme
```

### New dependencies
- `recharts@2` — charting (lazy-loaded)

### Tasks (ordered)

**Aggregators — STRICT TDD**

1. 🔴 `aggregators.test.ts`:
   - `byCategory(list, 'expense')` → `{ groceries: 12345, rent: 100000, ... }` (sorted desc)
   - `byMonth(list, '2026')` → `[{ month: '2026-01', income, expense, net }, ...]`
   - `summary(list, dateRange)` → `{ income, expense, net, avgDailySpend, count }`
   - Tombstones always excluded
   - Multi-currency: groups by currency (returns per-currency sub-maps) — spec §4.9
2. 🟢 Implement each with reduce.
3. 🔵 Extract `isInRange` helper.

**Date ranges — STRICT TDD**

4. 🔴 `date-ranges.test.ts`:
   - `lastNDays(30, now)` → `{ from, to }`
   - `thisMonth(now)`, `lastMonth(now)`, `thisYear(now)`, `lastYear(now)`
   - Respects timezone (use user's local midnight)
5. 🟢 Implement.

**UI**

6. Install Recharts: `pnpm add recharts`. Verify bundle impact with `pnpm build && vite-bundle-visualizer`.
7. `ReportsPage.tsx` — lazy-loaded via `React.lazy(() => import('@/features/reports/ui/ReportsPage'))` at the route level. **Must wrap in `<Suspense fallback={<PageSkeleton />}>`** — React 19 throws without a Suspense boundary. Create `shared/ui/PageSkeleton.tsx` (simple skeleton loader). [m1]
8. `CategoryDonut.tsx` — reads from store, uses `byCategory`, passes to Recharts.
9. `MonthlyTrendChart.tsx`.
10. `StatsGrid.tsx` — simple tiles.
11. `DateRangePicker.tsx` — dropdown with presets + custom range.
12. `DashboardTile.tsx` — condensed version for main dashboard.

**Accessibility (spec §4.10)**

13. Charts need text alternatives: provide `<table>` fallback with the same data. Toggle with "View as table" button. Required for WCAG 2.1 AA.

### Acceptance (spec §15 Reports)
- [ ] Dashboard shows summary + top categories + recent transactions
- [ ] Reports page shows donut, trend, and stats
- [ ] Switching date range recomputes in < 300ms
- [ ] Each chart has a keyboard-accessible table alternative
- [ ] Aggregator coverage ≥ 95%
- [ ] Recharts is in a separate chunk (verify in build output)

### Checkpoint commit
```
feat(reports): add aggregation library and lazy-loaded reports page

Pure aggregation functions built test-first. Reports page is code-split
via React.lazy so the Recharts bundle only loads when the user opens it.
Each chart has a table fallback for screen readers (WCAG 2.1 AA).
```

---

## 9. Phase 7 — Settings Slice

### Goal
Theme toggle (system/light/dark), locale/currency settings, export actions (JSON/CSV), sign out, and an "About" page.

### Depends on
Phases 2, 3, 4.

### TDD mode
**Test-alongside.** This is glue.

### Files to create

```
src/features/settings/
├── model/
│   ├── settings-store.ts                 # Zustand: theme, defaultCurrency, defaultLocale
│   └── settings-store.test.ts
├── ui/
│   ├── SettingsPage.tsx
│   ├── ThemeSection.tsx                  # radio group: system/light/dark
│   ├── LocaleSection.tsx                 # currency + locale dropdowns
│   ├── DataSection.tsx                   # export buttons + sign out
│   └── AboutSection.tsx                  # version, links, licenses
└── lib/
    └── theme-manager.ts                  # applies data-theme attribute; listens to prefers-color-scheme
```

### Tasks (ordered)

1. `settings-store.ts` — persists to Dexie `metadata` store (key='settings').
2. `theme-manager.ts` — pure function `resolveTheme('system' | 'light' | 'dark')` → `'light' | 'dark'`. Test it 🔴.
3. On app startup in `App.tsx`: load settings → apply theme → listen to `matchMedia('(prefers-color-scheme: dark)')` if theme is 'system'.
4. `LocaleSection.tsx` — lists supported currencies (spec supports any ISO 4217), defaults to detected.
5. `DataSection.tsx` — buttons: "Export JSON", "Export CSV", "Export current view", "Sign out". Wires to services from Phase 3 and Phase 4.
6. `SettingsPage.tsx` — composes the sections.
7. Component tests.

### Acceptance (spec §15 Theme & Locale)
- [ ] Dark mode toggle works; persists across reloads
- [ ] Switching currency changes formatting throughout the app
- [ ] Export buttons produce valid files
- [ ] Sign out clears all state and redirects to `/signin`

### Checkpoint commit
```
feat(settings): add theme, locale, export, and sign-out controls
```

---

## 10. Phase 8 — PWA Hardening

### Goal
App installs as a PWA on Android Chrome and desktop Chrome/Edge. Launches offline after first visit. All core operations work offline. Background sync via Workbox fires when connection returns.

### Depends on
Phases 0, 5.

### TDD mode
**E2E gate.** Service workers are hard to unit test; validate via Playwright with `context.setOffline(true)`.

### Files to create / modify

```
public/
├── manifest.webmanifest                  # name, short_name, icons, theme
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── maskable-512.png
└── favicon.svg

vite.config.ts                             # expand VitePWA config
src/sw-registration.ts                    # handles update prompts
e2e/
├── offline.spec.ts
├── install.spec.ts
└── update.spec.ts
```

### Tasks (ordered)

1. Expand `VitePWA` config in `vite.config.ts`:
   ```ts
   VitePWA({
     registerType: 'prompt',
     strategies: 'generateSW',
     workbox: {
       globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
       navigateFallback: '/personal-finance-app/index.html',
       runtimeCaching: [
         // NetworkOnly for Drive API — never cache auth'd API calls
         { urlPattern: /^https:\/\/www\.googleapis\.com\//, handler: 'NetworkOnly' },
         { urlPattern: /^https:\/\/accounts\.google\.com\//, handler: 'NetworkOnly' },
       ],
     },
     manifest: {
       name: 'Personal Finance',
       short_name: 'PFA',
       description: 'Zero-backend personal finance tracker',
       theme_color: '#0a0a0a',
       background_color: '#ffffff',
       display: 'standalone',
       start_url: '/personal-finance-app/',
       scope: '/personal-finance-app/',
       icons: [/* ... */],
     },
   })
   ```
2. Generate icons (use any PWA icon generator; commit the output).
3. `src/sw-registration.ts` — shows a toast when a new SW is waiting, offering "Reload to update".
4. Online reconnect sync [C4]:
   **Primary approach:** In the app root effect, add:
   ```ts
   window.addEventListener('online', () => syncService.runSync());
   ```
   This is sufficient — when the tab comes back online, the sync queue drains. No Service Worker involvement needed.

   **Why NOT Workbox BackgroundSyncPlugin:** That plugin replays failed `fetch()` requests (network-level replay). Our sync logic is `runSync()` — a complex function in the main thread that reads IndexedDB, calls `mergeTransactions()`, writes back, and calls `broadcastChannel.postMessage()`. The SW has no access to the app's module graph and cannot run this logic. BackgroundSyncPlugin solves a different problem.

   The `online` event also fires when:
   - The tab was offline and regains connectivity (primary case)
   - The app is reopened after being offline (via the sync-on-load path in `auth-store`)
   
   If the tab was **closed** while offline: the sync queue persists in IndexedDB. Next time the app loads, run `syncService.runOnLoad()` which checks for pending queue entries and drains them.
5. `e2e/offline.spec.ts`:
   - Visit `/` → wait for install
   - `context.setOffline(true)`
   - Reload → app still loads (precached)
   - Add transaction → appears in UI
   - `context.setOffline(false)` → sync queue flushes → Drive file has the transaction
6. `e2e/install.spec.ts` — assert `beforeinstallprompt` fires (Chromium only).
7. `e2e/update.spec.ts` — build + serve two versions, verify update toast appears.

### Acceptance (spec §15 PWA & Offline)
- [ ] App installs as PWA on Android Chrome and desktop Chrome/Edge
- [ ] App launches offline after first visit
- [ ] All core operations work offline
- [ ] Offline queue flushes automatically on reconnect
- [ ] Update prompt appears when new SW is waiting

### Checkpoint commit
```
feat(pwa): add vite-plugin-pwa with offline precache and background sync

App is now installable and works fully offline. Sync queue drains
automatically when connectivity returns. Drive API calls are explicitly
NetworkOnly — we never cache authenticated responses.
```

---

## 11. Phase 9 — Deployment (GitHub Pages)

### Goal
Every push to `main` deploys to `https://encryptioner.github.io/personal-finance-app/` with SPA deep-link support, Lighthouse CI gate, and secrets wiring.

### Depends on
Phases 0, 8.

### TDD mode
**E2E gate** against the deployed URL.

### Files to modify

```
.github/workflows/deploy.yml
public/404.html                            # SPA fallback
.github/workflows/lighthouse.yml           # Lighthouse CI on PR previews (optional)
README.md
```

### Tasks (ordered)

1. Create `public/404.html` per spec §12.3 — redirects deep links to the SPA entry point.
2. Expand `deploy.yml`:
   ```yaml
   on: { push: { branches: [main] } }
   permissions: { pages: write, id-token: write }
   jobs:
     build:
       runs-on: ubuntu-latest
       env:
         VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
       steps:
         - checkout
         - setup pnpm
         - install
         - build
         - upload-pages-artifact with path: ./dist
     deploy:
       needs: build
       environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }
       runs-on: ubuntu-latest
       steps:
         - id: deployment
           uses: actions/deploy-pages@v4
   ```
3. Add `VITE_GOOGLE_CLIENT_ID` to repo secrets.
4. Update Google Cloud OAuth client's Authorized JavaScript origins to include `https://encryptioner.github.io`.
5. Verify the deployed URL loads, deep links work, sign-in works, sync works.
6. **Required** (not optional): Lighthouse CI workflow that fails the PR if scores < 95/95/95/100 — spec §15 acceptance criteria lists these as "MVP Done When" conditions. Run against `pnpm preview` (local prod build) in CI, not the live URL.
7. Update README with the live URL and dev setup.

### Acceptance (spec §15 Deployment)
- [ ] CI green on every PR
- [ ] Deploy publishes to GitHub Pages on push to main
- [ ] Deployed app loads without 404s on deep links
- [ ] OAuth works against production origin
- [ ] Lighthouse Performance / Accessibility / Best Practices / PWA ≥ 95 / 95 / 95 / 100

### Checkpoint commit
```
ci(deploy): wire github actions to publish to github pages

Adds SPA 404 fallback, Pages artifact upload, and VITE_GOOGLE_CLIENT_ID
secret wiring. Live at https://encryptioner.github.io/personal-finance-app/
```

---

## 12. Phase 10 — Accessibility + Final Polish

### Goal
Meet WCAG 2.1 AA across every user flow. Zero `any`. Bundle under budget. Lighthouse scores locked in. No console errors.

### Depends on
All previous phases.

### TDD mode
**E2E gate** using axe-core integration in Playwright.

### Tasks (ordered)

1. Install `@axe-core/playwright`.
2. Add an axe check to every E2E spec (`expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()`).
3. Manual keyboard-only sweep: can I do everything without a mouse? Fix any traps.
4. Focus management: after closing a dialog, focus returns to the trigger.
5. Color contrast audit: use devtools contrast checker on every text/bg pair. Fix any < 4.5:1.
6. Screen reader sweep (VoiceOver on macOS): can I understand the page structure? Add missing `aria-label` / `aria-describedby`.
7. Bundle audit: `pnpm build && pnpm dlx vite-bundle-visualizer` → confirm < 250KB initial, < 500KB total.
8. Zero-console-error check: load every page, check DevTools console is clean.
9. Run Lighthouse CI in the deployed env; confirm scores.
10. Final pass on the full acceptance list in spec §15.

### Acceptance
- [ ] All items in spec §15 Acceptance Criteria are checked off
- [ ] `@axe-core/playwright` reports zero violations on all E2E specs
- [ ] Bundle < 250KB gzipped initial, < 500KB total
- [ ] Zero `any` in the codebase (`pnpm typecheck --noUncheckedIndexedAccess`)
- [ ] Zero console errors in production build

### Checkpoint commit
```
chore(a11y): final WCAG 2.1 AA sweep with axe-core integration

Adds axe checks to every e2e spec, fixes discovered focus/contrast/label
issues, and verifies bundle + lighthouse budgets hold. MVP is shippable.
```

---

## 13. Cross-Phase Concerns

### 13.1 Commit discipline
- One logical change per commit (spec §global git-workflow)
- Conventional Commits format: `<type>(<scope>): <summary>`
- Types used: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`, `ci`
- Branch naming: `PFA-1/main/v2/<short-slice>` — e.g. `PFA-1/main/v2/shared-kernel`

### 13.2 CI gates (must pass for every PR)
1. `pnpm lint` — eslint flat config
2. `pnpm typecheck` — `tsc --noEmit`
3. `pnpm test` — Vitest with coverage thresholds (spec §10.3)
4. `pnpm exec playwright test` — E2E
5. `pnpm build` — produces `dist/` without warnings

### 13.3 Coverage thresholds (enforce in `vitest.config.ts`)
- `shared/lib/**`, `shared/validation/**`: **95%**
- `features/*/api/**`, `features/*/model/**` (services, stores): **90%**
- `features/*/ui/**`: **85%**
- `features/*/lib/**`: **80%**
- E2E-only paths (SW, install prompt): **not counted**

### 13.4 Bundle budget (enforce in CI)
- Initial: 250KB gzipped
- Total: 500KB
- Use `rollup-plugin-visualizer` to track growth PR-over-PR

### 13.5 Dependency policy
- Every new dep needs a one-line justification in its PR description
- Prefer stdlib / Intl / native APIs over libs where reasonable
- No lodash, no moment.js, no axios (use fetch)

### 13.6 Error message constants
Per user's typescript-general rule: server/domain error messages MUST come from constant files. Create `src/shared/constants/messages.ts` at the start of Phase 1 and import everywhere.

### 13.7 Mid-implementation spec drift
If during any phase you discover a spec gap or assumption-break:
1. Stop the phase
2. Note it in `ai/PFA-1/requirements/grill-log.md` under a "Discovered during implementation" section
3. Update spec §17 Change Log
4. Resume with corrected spec

### 13.8 Model routing for this build
- Foundations scaffolding, boilerplate generation → Haiku or Sonnet
- Implementation, testing, reviewing → Sonnet (primary)
- Merge function design, sync architecture debugging, cross-file refactors → Opus
- (Matches user's global model-routing rule)

---

## 14. Risk Log

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R1 | Merge function has a subtle bug that loses data | Med | Catastrophic | Property-based tests (commutativity/associativity/idempotence); dedicated E2E for concurrent edits; conservative tiebreaker by deviceId |
| R2 | Silent token renewal fails on iOS Safari PWA | High | High | Document in known issues; surface clear "please sign in again" UX; Phase 2 fix via Capacitor wrapper |
| R3 | Drive API rate limits hit with aggressive sync | Low | Med | 500ms per-tab debounce; exponential backoff; max-5-retry cap |
| R4 | Bundle bloat from Recharts | Med | Med | Lazy-load Reports route; tree-shake unused chart types; alternative: hand-roll SVG if >50KB |
| R5 | IndexedDB schema change breaks existing users | Med | High | Dexie migrations from day one; schemaVersion in JSON file; write a migration test before the change |
| R6 | CSV imports with weird encodings (Shift-JIS, etc.) | Low | Low | Detect BOM, document UTF-8 expectation, defer non-UTF-8 to Phase 2 |
| R7 | GitHub Pages 404 on deep links | Med | Med | `public/404.html` SPA fallback (spec §12.3); verified in Phase 9 E2E |
| R8 | `@react-oauth/google` vs manual GIS — temptation to use the library | Low | Low | Explicitly forbidden by spec §4.1; use `gis-client.ts` wrapper instead |
| R9 | Test suite slow (> 5 min) and skipped | Med | Med | Keep unit tests in jsdom (fast); E2E parallelized via Playwright workers; run only affected tests on pre-commit |
| R10 | Implementer drifts from "simple over clever" | Med | Med | Every PR reviewed against spec §2 principle 0a; push back on clever abstractions |

---

## 15. Out of Scope for This Plan

Explicitly not planned for this build:

- **Sheets export (Phase 2 feature)** — see spec §14.2 item 3
- **Recurring transactions** — Phase 2
- **Budgets** — Phase 2
- **Shared/family accounts** — Phase 2+
- **Capacitor wrapper** — Phase 2+
- **String translations (react-i18next)** — Phase 2
- **Cross-currency conversion** — Phase 2
- **Receipt attachments** — Phase 2
- **Micro-frontend extraction** — Phase 3+

If any of these creep into the MVP during implementation, **stop and escalate**. The MVP's job is to prove the zero-backend sync story, not to be feature-complete.

---

## 16. Change Log

| Version | Date | Change | Author |
|---------|------|--------|--------|
| 1.0 | 2026-04-04 | Initial plan | Claude Code |
| 2.0 | 2026-04-10 | Full rewrite aligned with spec v2.0. Feature-sliced phase order: foundations → kernel → transactions (local) → CSV → auth → sync → reports → settings → PWA → deploy → a11y. Pragmatic TDD at boundaries with strict red-green-refactor flagged per-file for pure logic. Added risk log, coverage thresholds, bundle budget enforcement, cross-phase concerns, and explicit out-of-scope list. | Claude Code |
| 2.1 | 2026-04-10 | Post-grill fixes: C1 Tailwind v4 tooling (`@tailwindcss/vite`, remove PostCSS); C2 `eslint-config-prettier` added; C3 `shadcn init` before `add`; C4 Background Sync replaced with `window.addEventListener('online')`; C5 React Router `basename={import.meta.env.BASE_URL}` for subpath deploy; M1 `getDecimalPlaces(currency)` for JPY/KWD/etc.; M2 duplicate Drive file merge in `findOrCreateTransactionsFile`; M3 `schemaVersion` guard before merge; M4 CSP meta tag added to Phase 0; M5 `git init` added to Phase 0; m1 Suspense boundary for React.lazy; m2 Playwright `baseURL` config; m3 `rollup-plugin-visualizer` in deps; N1 single `retryCount` param for `runSync`; N2 absolute userinfo URL; N3 Lighthouse CI required not optional; N4 Levenshtein removed from CSV column mapper. | Claude Code |
