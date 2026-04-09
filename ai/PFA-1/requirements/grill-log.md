# Grill Log: Personal Finance PWA — Spec + Implementation Plan

**Date:** 2026-04-10
**Grilled by:** Claude (Hard Critic Mode)
**Input:** `specs/2026-04-04-personal-finance-pwa-mvp.md` + `plans/2026-04-04-personal-finance-pwa-implementation.md`
**Ticket:** N/A (pre-ticket planning)
**Verdict:** **NEEDS REWORK**

## Summary

The vision is sound and the feature set is reasonable for an MVP, but the spec contains **two architectural blockers** that will break multi-device sync on day one (wrong OAuth scope, whole-file last-write-wins = silent data loss), several **tech-stack mismatches** with the user's global conventions (npm vs pnpm, Tailwind v3 vs v4, React 18 vs 19, shadcn-ui deprecated), and the plan is **structurally incomplete** — it trails off at Phase 4 with "Continue with remaining phases…", leaving the hardest parts (Sync Engine, Reporting, UI, PWA, Deployment) unplanned. The plan also claims to be TDD but tasks are written test-after, not test-first, and contains at least two compile-breaking code bugs.

**Stats:** 34 findings — 2 Blocker, 8 Critical, 17 Major, 5 Minor, 2 Note

---

## Findings

### BLOCKER

#### [B1] `drive.file` scope fundamentally breaks multi-device sync

- **Location:** Spec §4.1 (Authentication & Setup), Plan Task 8, `.env.example`
- **Issue:** Spec specifies `drive.file` OAuth scope. The `drive.file` scope only grants access to files **created or opened by your app in the current or previous OAuth sessions** — it does NOT let you "see" files that the same app created on a different device. On Device B's first login, the folder search will return empty, and the app will happily create a second `My Finance App/` folder. Users will end up with N folders (one per device), none synced.
- **Risk:** Multi-device sync is advertised as core MVP value. It will not work. Users will think the app is broken on every new device.
- **Recommendation:** Use **`drive.appdata`** scope instead. It exposes a hidden, app-private, cross-device-consistent folder (AppDataFolder) that's always accessible to any instance of the same OAuth client ID. No folder discovery needed. Bonus: users can't accidentally delete or modify the file from their Drive UI. Trade-off: users can't manually inspect their data file — mitigated by adding an "Export to JSON/CSV" button in settings.

#### [B2] Last-write-wins on a single `transactions.json` file silently loses data

- **Location:** Spec §4.4 (Sync Strategy), "Merge strategy: Last-write-wins (timestamp-based)"
- **Issue:** Read-modify-write on a whole file without optimistic concurrency = classic lost-update bug:
  1. Device A fetches `transactions.json` at t0 (100 txns)
  2. Device B fetches at t0 (same 100 txns)
  3. A adds 3 new txns locally → uploads at t1 (103 txns)
  4. B adds 2 different new txns locally → uploads at t2 (102 txns, missing A's 3)
  5. **A's 3 transactions are gone forever.**
- **Risk:** Silent, permanent data loss. This is worse than a crash because users won't notice until they need the data.
- **Recommendation:** Either (a) fetch-merge-upload with per-transaction keyed merge (union by `id`, last-write-wins *per transaction* using `updatedAt`) AND use Drive's `If-Match` ETag header for optimistic concurrency (retry on 412 Precondition Failed), or (b) write per-device change logs (append-only files `changes-<deviceId>.jsonl`) and merge on read. Option (a) is simpler and sufficient for single-user multi-device. **Also need tombstones for deletes** (see [C2]).

---

### CRITICAL

#### [C1] Plan conflates `idToken` and `accessToken` — can't actually call Drive API

- **Location:** Plan Task 8, `googleAuth.ts`: `accessToken: idToken // Will be replaced with actual access token`
- **Issue:** `@react-oauth/google`'s `<GoogleLogin>` component returns an **ID token** (OIDC JWT proving identity), not an **access token** for Drive API. The Drive API will reject every request. The comment "will be replaced" is technical debt that's never resolved in any later task. Also, `refreshAccessToken` POSTs to `oauth2.googleapis.com/tokeninfo`, which is a **validation** endpoint — it cannot return a new access token.
- **Risk:** Sync engine can never actually talk to Drive. Entire product non-functional.
- **Recommendation:** Use Google Identity Services (GIS) **token client** with `useGoogleLogin({ flow: 'implicit', scope: 'https://www.googleapis.com/auth/drive.appdata' })` — this returns an access token scoped to Drive. For silent renewal: call the same token client with `prompt: ''` when nearing expiry; if the user still has an active Google session it succeeds silently. There is **no refresh token** in the implicit flow (by design, since no backend).

#### [C2] Deletes + last-write-wins = zombie transactions

- **Location:** Spec §4.2 ("Soft delete... or hard delete with conflict resolution" — undecided)
- **Issue:** Device A deletes txn T and syncs. Device B (offline) edits txn T with a later `updatedAt`. B comes online → B's version "wins" → T is resurrected permanently.
- **Risk:** Deleted data keeps coming back. Users lose trust.
- **Recommendation:** Use **tombstones**: deleted records are kept with `deletedAt` timestamp. Merge rule: if *any* replica has `deletedAt`, the record is deleted (delete wins). GC tombstones older than, say, 90 days (conservative safety window).

#### [C3] Incomplete plan — Phases 5-11 are missing

- **Location:** Plan line 1560: `[**Continue with remaining phases in next section due to length constraints...**]`
- **Issue:** The plan only breaks down Phases 1-3 + start of 4 (Tasks 1-10). Sync Engine, Reporting, UI, PWA, Service Worker, Testing, and Deployment have zero task content. These are 70% of the actual work and all the risky parts.
- **Risk:** Implementation will stall at Phase 4. Critical risks (sync correctness, PWA cache invalidation, offline UX) are unplanned.
- **Recommendation:** Rewrite the plan end-to-end with TDD ordering. Break each phase into vertical slices (one user story at a time) rather than horizontal layers (all types → all services → all UI).

#### [C4] Plan is labeled TDD but written test-after

- **Location:** Plan "Execution Instructions" says "TDD-based plan (test-first)", but every task is *implement first, then write tests*
- **Issue:** Example: Task 7 Step 3 creates `indexedDB.ts` (implementation), then Step 4 writes the test. True TDD is red → green → refactor: write failing test, watch it fail, write minimal code to pass, refactor. Writing tests after is just "has tests" — you miss design feedback, you test what you built instead of what you need, and you skip the "is this interface usable?" signal.
- **Risk:** User explicitly asked for TDD best practices. This plan doesn't deliver that.
- **Recommendation:** Rewrite each task as: **(1) Write failing test** → (2) Run, confirm red → (3) Minimal implementation → (4) Run, confirm green → (5) Refactor → (6) Commit. Also enforce test-at-the-boundary (unit-test pure services; integration-test I/O; e2e for user flows) rather than testing every function.

#### [C5] Dexie schema uses `++id` (auto-increment) but transactions have UUID string IDs

- **Location:** Plan Task 7, `schema.ts`: `transactions: '++id, date, category, syncStatus, createdAt'`
- **Issue:** `++id` tells Dexie "auto-increment integer primary key". But `Transaction.id` is a UUID v4 string (per types). Adding a transaction with a UUID will either fail or Dexie will ignore your UUID and assign a number. Integration tests will fail immediately.
- **Risk:** Nothing works; also breaks sync because the UUID is what links local ↔ Drive records.
- **Recommendation:** Change to `'id, date, category, type, syncStatus, updatedAt, createdAt'` (no `++`, add `updatedAt` index for merge queries, add `type` for filtering).

#### [C6] `googleDriveAPI.ts` object literal is syntactically invalid TypeScript

- **Location:** Plan Task 9, `googleDriveAPI.ts`:
  ```ts
  export const googleDriveAPI = {
    private appFolderId: string | null = null,
    async getOrCreateAppFolder(...) { ... this.appFolderId = ... }
  }
  ```
- **Issue:** `private` is a class member modifier, not valid in object literals. Type annotations with `=` defaults on object literal members are also invalid syntax. Using `this` inside object-literal methods and mutating a captured outer variable is fragile and breaks if destructured.
- **Risk:** File won't compile. Also reveals the plan code wasn't dry-run.
- **Recommendation:** Make it a class (`class GoogleDriveAPI { private appFolderId: string | null = null; ... }`) and export a singleton instance, or use a module-scoped `let`. Prefer the class for testability.

#### [C7] GitHub Pages base path will break routing, OAuth origin, and SW scope

- **Location:** User requested GitHub Pages deployment (spec says Netlify/Vercel)
- **Issue:** GitHub Pages for a project repo serves from `https://<user>.github.io/personal-finance-app/`. This means:
  - Vite needs `base: '/personal-finance-app/'` or routing breaks
  - Service Worker scope is limited to `/personal-finance-app/` (fine, but must register with correct path)
  - **Google OAuth authorized origins must exactly match** including the subpath's origin (`https://<user>.github.io`) — but there's no subpath in origins, only in redirect URIs; multiple apps under the same `github.io` origin share the same authorized origin, which is a confusion risk
  - Manifest `start_url` must be `/personal-finance-app/` not `/`
  - All asset paths must be relative or base-prefixed
- **Risk:** App loads but all internal routes 404, OAuth popup fails with `redirect_uri_mismatch`, SW doesn't intercept, PWA install doesn't land on the right URL.
- **Recommendation:** Add a dedicated "GitHub Pages deployment" section in the spec covering: Vite base, BrowserRouter basename, manifest paths, SW registration path, OAuth setup (authorized origins + redirect URIs), and a `404.html` SPA fallback trick for deep links. Consider using a custom domain later to remove the subpath complexity.

#### [C8] Google OAuth in embedded webviews is blocked by Google

- **Location:** User request: "possible... webview app"
- **Issue:** Since 2021, Google blocks OAuth in embedded webviews (WKWebView, Android WebView) for security. Sign-in will show "This browser or app may not be secure." Native wrapper strategies (Capacitor, Cordova, Tauri mobile) must use system browser + custom URL scheme (SFAuthenticationSession / Chrome Custom Tabs), not webview.
- **Risk:** The "webview app" path quietly dies once anyone tries to build it.
- **Recommendation:** Document this now. Plan for Capacitor with `@capacitor/browser` or native OAuth plugin (`@capacitor-community/google-auth`) if a mobile wrapper becomes real. Avoid pure WebView wrappers.

---

### MAJOR

#### [M1] No modular monolith / micro-frontend architecture

User requested "modular monolith, micro frontend". Plan uses a flat `src/components/`, `src/services/`, `src/stores/` layer-based structure — the opposite of modular. Recommend **feature-sliced design (FSD)** or vertical slices:

```
src/
├── features/
│   ├── auth/         # Google sign-in, token management
│   ├── transactions/ # Add/edit/delete/list/CSV import
│   ├── sync/         # Drive sync engine, conflict resolution
│   ├── reports/      # Dashboard, charts, aggregation
│   └── settings/     # Export, sign out, preferences
├── shared/
│   ├── ui/           # shadcn components, common UI
│   ├── lib/          # Dexie wrapper, formatters, validators
│   └── types/        # Cross-feature types
└── app/              # Routing, providers, shell
```
Each feature owns its own components, stores, services, and tests. Cross-feature dependencies only via `shared/` or explicit public APIs (`features/*/index.ts`). This is true modular monolith. Micro-frontend (Module Federation) is overkill for a single-team app — note in the spec as Phase 3+ option, not MVP.

#### [M2] React 18 → React 19

Spec says React 18. It's April 2026 and React 19 is current stable with React Compiler, `use()`, Actions, form state, Document metadata, etc. User asked for "latest approach and best practices". Upgrade to React 19 + enable React Compiler in Vite config.

#### [M3] Tailwind v3 → v4 (user's global convention)

Side-projects CLAUDE.md: "Tailwind CSS is the standard for new projects (v4 in newest)". Plan uses v3 config (`tailwind.config.js` with `content`, PostCSS plugin). Tailwind v4 is CSS-first (`@import "tailwindcss"; @theme { --color-primary: ... }`), no PostCSS config needed, faster, smaller. Update.

#### [M4] `shadcn-ui` package is deprecated → `shadcn`

Plan: `npm install -D shadcn-ui` and `npx shadcn-ui@latest init`. The package was renamed. Correct: `npx shadcn@latest init`. Also, new shadcn is Tailwind v4 compatible — works with [M3].

#### [M5] npm → pnpm (user's global convention)

Side-projects CLAUDE.md: "pnpm is the standard across all projects". Plan uses npm throughout. Change all commands to pnpm. Add `packageManager` field in `package.json`.

#### [M6] Custom service worker → `vite-plugin-pwa`

Plan has a bespoke `public-worker/sw.ts` build pipeline. Reinventing Workbox is a bug farm (cache invalidation, precaching, navigation routing, update flow, skipWaiting semantics). Use `vite-plugin-pwa` — handles manifest, SW generation, update UX, precaching, auto-update. Exposes `useRegisterSW` hook for update prompts. Much less code, battle-tested.

#### [M7] Custom CSV parser → `papaparse`

Plan has `src/services/csv/csvParser.ts`. Real CSVs have edge cases: quoted commas, escaped quotes, BOMs, CRLF vs LF, header variations, international date formats. `papaparse` is ~45KB gzipped, handles all of it, has streaming for large files. Use it.

#### [M8] Recharts bundle size underestimated

Spec claims "30KB gzipped" for recharts. Actual: ~100KB+ minified+gzipped with typical usage (depends on which chart components you import; Recharts imports d3 submodules). May blow the 400KB bundle budget (§11). Alternatives: **Chart.js** (~60KB), **visx** (tree-shakeable, smaller if you use 2-3 chart types), or **custom SVG** for the simple bar/line/donut this app needs (dashboards with <5 chart types rarely justify a chart library).

#### [M9] Currency & i18n not addressed

"Could be used by any normal user" but everything is `$`, English, `MM/DD/YYYY`. For global usability:
- Currency: default from `Intl.NumberFormat(navigator.language)`, store user-chosen currency in settings
- Dates: `Intl.DateTimeFormat(navigator.language)` for display, ISO for storage
- Strings: plan for react-i18next with `en.json` + `bn.json` (since user works with Bengali in other projects) OR explicitly defer i18n to Phase 2 in the spec

#### [M10] Accessibility (WCAG) not planned

"Good UI/UX" ≠ "good UI for sighted keyboard users only". Need: keyboard-only nav test, focus management in modals (shadcn handles this, but verify), ARIA labels on charts (charts are notoriously inaccessible — add text summaries), color contrast check (your primary blue on white is fine, but chart palettes need testing), screen reader test of transaction list. Lighthouse a11y 95+ requires real work, not luck.

#### [M11] PWA + OAuth popup broken on iOS Safari standalone mode

iOS PWA in standalone mode has a known issue: `window.open()` from the main window is blocked or opens in an external Safari tab (losing state). Google Identity Services popup flow needs explicit handling here. Options: (a) redirect flow on iOS instead of popup, (b) open GIS One Tap which handles it better, (c) accept the tab switch. Decide and document.

#### [M12] No data export / backup path

All data in user's Drive + local. If user wants to leave the app or back up outside Google, there's no escape hatch. Add MVP feature: "Settings → Export all transactions to CSV/JSON". Cheap (one function, one button), huge trust signal.

#### [M13] E2E test strategy for OAuth is undefined

Plan has `tests/e2e/auth.spec.ts` but Playwright can't automate real Google OAuth (Google detects automation and blocks). Options: (a) mock GIS client in tests via `window.google` injection, (b) use a pre-seeded token, (c) skip OAuth in E2E and test post-auth flows only. Pick one and document in the plan.

#### [M14] Sync engine complexity underestimated

Sync engine is Phase 5 with zero task breakdown. Real scope: tombstones, ETag retry loop, exponential backoff, queue persistence, background sync via SW, visibility-change triggered sync, concurrent tab coordination (BroadcastChannel to avoid dueling syncs across tabs), merge algorithm, conflict counter for metrics, sync status UI. This is 8-12 tasks minimum.

#### [M15] `@types/dexie` and `@types/@react-oauth/google` don't exist

Plan: `npm install -D @types/dexie` (Dexie ships own types) and `npm install -D @types/@react-oauth/google` (invalid scoped path, also ships own types). Both commands fail.

#### [M16] Token expiry = forced re-login mid-session

1-hour token + no silent refresh = user is using the app, suddenly sees an auth error, has to click sign-in again, loses context. With GIS implicit flow, you can call the token client with `prompt: ''` before expiry and get a new token silently if Google session is active. Bake this into sync engine.

#### [M17] No `CLAUDE.md` in project

User's workflow explicitly checks for project-level CLAUDE.md. This project doesn't have one. Should be created after decisions below, capturing: tech stack (versions), package manager, directory structure (FSD), TDD workflow, deployment target, OAuth scope, sync model.

---

### MINOR

#### [m1] Dark mode is "ready" but not a decided feature

Shadcn supports it, Tailwind v4 supports it, but spec doesn't say "MVP includes dark mode toggle" or "dark mode is Phase 2". Decide.

#### [m2] Phase ordering: PWA is Phase 9, but offline is core principle

Offline works as soon as IndexedDB + Zustand persistence are in (Phase 2). PWA installability is separate from offline. Re-label phases so "offline" isn't gated by "PWA".

#### [m3] No performance budget enforcement in CI

Spec lists perf targets (§11) but nothing enforces them. Add `size-limit` or Lighthouse CI in the GH Actions workflow.

#### [m4] Single-user limit not stated in UX

Spec §12.1 says "single user per account" but nothing in the UI says so. If a user shares their Google account with a spouse for a shared finance app, they'd both see the same data — which might be desired or not.

#### [m5] No explicit PWA update UX

SW updates are tricky: when a new version is deployed, the user needs a prompt to reload. Workbox/vite-plugin-pwa gives you this, but the UX needs to be specified (toast? full-screen banner? auto-reload?).

---

### NOTES

#### [N1] `ai/<ticket>/` workflow convention not used

User's workflow puts specs/plans in `ai/<ticket-no>/requirements/` and `ai/<ticket-no>/plans/`. This project uses top-level `specs/` and `plans/`. Not wrong, just divergent — decide which to use going forward.

#### [N2] Consider deferring Google Sign-In entirely for MVP v0

Biggest sources of risk in this plan are all OAuth/Drive related. A genuinely zero-backend MVP v0 could ship **local-only** (IndexedDB + export/import JSON manually), no sign-in, no sync. Ship in days, validate the core UX, then add sync. Worth considering as an explicit MVP-minus-minus.

---

## Security Assessment

| Category | Status | Notes |
|----------|--------|-------|
| Authentication | **RISK** | Wrong scope (B1), broken token flow (C1), no silent refresh (M16) |
| Authorization | N/A | Single-user app, all data is the user's own |
| Input Validation | OK | Zod schemas planned for transactions and CSV |
| Data Exposure | OK | No backend = no server logs; client-only data flow |
| Rate Limiting | OK | Google Drive API is the only external; they rate limit us |
| Secrets | OK | Only `VITE_GOOGLE_CLIENT_ID` in bundle; client IDs are public-safe |
| Data Integrity | **RISK** | Whole-file LWW loses data (B2); no tombstones (C2); no ETag concurrency |

---

## Spec Coverage (Plan → Spec)

| Spec Section | Covered in Plan | Status |
|-----------|-----------------|--------|
| §4.1 Auth | Task 8-10 | Partial — wrong tokens, wrong scope |
| §4.2 Transactions | Not in plan (Phases 4+) | **Missing** |
| §4.3 Reporting | Not in plan (Phases 6+) | **Missing** |
| §4.4 Sync | Not in plan (Phases 5+) | **Missing** |
| §4.5 Offline | Not in plan (Phases 9+) | **Missing** |
| §4.6 PWA | Not in plan (Phases 9+) | **Missing** |
| §6 Data Model | Task 6-7 | Partial — schema bug (C5) |
| §10 Testing | Execution Instructions | Weak — test-after not TDD (C4) |
| §13 Deployment | Not in plan (Phases 11+) | **Missing** |

---

## Assumptions Made (and risks if wrong)

1. **Assumption:** `drive.file` scope is sufficient for cross-device sync — **WRONG** (see B1)
2. **Assumption:** Whole-file last-write-wins is safe — **WRONG** (see B2)
3. **Assumption:** ID token can call Drive API — **WRONG** (see C1)
4. **Assumption:** Recharts is 30KB — **likely wrong** (closer to 100KB)
5. **Assumption:** iOS Safari PWA handles OAuth popups normally — **may be wrong** (M11)
6. **Assumption:** Google OAuth works in webviews — **wrong** (C8)
7. **Assumption:** shadcn-ui package name — **deprecated** (M4)

---

## Missing from Spec/Plan

- [ ] GitHub Pages deployment specifics (base path, 404 fallback, OAuth origins)
- [ ] Sync tombstones / delete semantics
- [ ] Token silent-refresh flow
- [ ] Modular monolith architecture (feature slices)
- [ ] Data export (non-Drive escape hatch)
- [ ] PWA update UX
- [ ] Currency & i18n strategy
- [ ] Accessibility acceptance criteria
- [ ] E2E strategy for OAuth-gated flows
- [ ] Multi-tab sync coordination (BroadcastChannel)
- [ ] CI: bundle size + Lighthouse budget enforcement
- [ ] Project-level CLAUDE.md

---

## Verdict: NEEDS REWORK

The vision is solid and mostly-right, but the spec has two blockers that make multi-device sync impossible as written, the plan is incomplete (70% of work unplanned), and several tech-stack choices don't match the user's global conventions. Before writing any code:

1. **Fix the two blockers** (B1, B2) → swap scope to `drive.appdata`, adopt per-txn merge + ETag + tombstones
2. **Clarify TDD approach** → rewrite plan as vertical slices with red-green-refactor per task
3. **Pick architecture** → feature-sliced modular monolith (defer micro-frontends)
4. **Align tech stack** → React 19, Tailwind v4, pnpm, shadcn, vite-plugin-pwa, papaparse
5. **GitHub Pages pre-flight** → base path, routing, OAuth origins, manifest paths
6. **Complete the plan** → task breakdown for Phases 4-11 or equivalent feature slices
