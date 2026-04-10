# Personal Finance App

Zero-backend personal finance PWA. Transactions sync to your own Google Drive — your data, your account, no server.

## Quick start

```bash
cp .env.example .env.local
# fill in VITE_GOOGLE_CLIENT_ID (see docs/oauth-setup.md)

pnpm install
pnpm dev
```

App runs at `http://localhost:5173/personal-finance-app/`.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Serve `dist/` locally |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest watch mode |
| `pnpm test:run` | Vitest single run + coverage |
| `pnpm exec playwright test` | E2E tests |

## Architecture

See `CLAUDE.md` for architecture details, data model, and conventions.
See `ai/PFA-1/requirements/spec.md` for the full spec.
