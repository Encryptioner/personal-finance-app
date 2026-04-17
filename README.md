# Personal Finance App

Zero-backend personal finance PWA. Transactions sync to your own Google Drive — your data, your account, no server.

**Live at:** https://encryptioner.github.io/personal-finance-app/

## Quick start

```bash
cp .env.example .env.local
# Edit .env.local and add your VITE_GOOGLE_CLIENT_ID

pnpm install
pnpm dev
```

App runs at `http://localhost:5173/personal-finance-app/`.

## OAuth setup (one-time)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a new project
2. Enable the **Google Drive API**
3. Configure the **OAuth consent screen**:
   - User type: External
   - Publishing status: Testing (fine for personal use)
   - Add scope: `https://www.googleapis.com/auth/drive.appdata` only
4. Create credentials: **OAuth 2.0 Client ID** → Web application
5. Add authorized JavaScript origins:
   - `http://localhost:5173` (dev)
   - `https://encryptioner.github.io` (prod)
6. Copy the Client ID into `.env.local` as `VITE_GOOGLE_CLIENT_ID=your-id-here`
7. For production deployment, add the same value as a GitHub repository secret

> **Note:** Since the app is in "Testing" mode, Google shows an "unverified app" warning on first sign-in. The app handles this gracefully — users see a consent dialog explaining the steps before sign-in begins.

## Privacy

All data stays on your device and in your own Google Drive's hidden app folder. No backend, no tracking, no analytics.

See the full [Privacy Policy](https://encryptioner.github.io/personal-finance-app/privacy).

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

## License

MIT

## Support

If you find my work useful, consider supporting it:

[![SupportKori](https://img.shields.io/badge/SupportKori-☕-FFDD00?style=flat-square)](https://www.supportkori.com/mirmursalinankur)
