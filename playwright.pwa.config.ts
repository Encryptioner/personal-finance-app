import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for PWA tests.
 * Runs against the production build (with service worker) via pnpm preview.
 * Use: pnpm test:e2e:pwa
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/offline.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4173/personal-finance-app',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/personal-finance-app/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
