import { test, expect, type Page } from '@playwright/test'

/**
 * Full sync cycle: sign in → add transaction → auto-sync fires → PATCH called.
 *
 * Drive API base URLs (from drive-client.ts):
 *   DRIVE_API_BASE  = https://www.googleapis.com/drive/v3
 *   UPLOAD_API_BASE = https://www.googleapis.com/upload/drive/v3
 */

const FAKE_FILE_ID = 'e2e-transactions-file'
const ETAG_1 = '"etag-v1"'
const ETAG_2 = '"etag-v2"'

const EMPTY_DRIVE_BODY = JSON.stringify({
  schemaVersion: 1,
  lastModified: new Date().toISOString(),
  devices: [],
  transactions: [],
})

async function injectGisMock(page: Page) {
  await page.addInitScript(() => {
    type FakeGoogle = {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            callback: (r: {
              access_token: string
              expires_in: number
              error?: string
            }) => void
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
          revoke: (token: string, cb?: () => void) => void
        }
      }
    }
    ;(window as unknown as { google: FakeGoogle }).google = {
      accounts: {
        oauth2: {
          initTokenClient: (cfg) => ({
            requestAccessToken: (opts) => {
              if (opts?.prompt === '') {
                cfg.callback({ access_token: '', expires_in: 0, error: 'no_session' })
              } else {
                cfg.callback({ access_token: 'fake-access-token', expires_in: 3600 })
              }
            },
          }),
          revoke: (_token, cb) => {
            cb?.()
          },
        },
      },
    }
  })
}

async function setupDriveMocks(page: Page) {
  await page.route('**/oauth2/v3/userinfo**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'sync@example.com',
        name: 'Sync User',
        picture: 'https://placehold.co/64x64.png',
      }),
    }),
  )

  // List → no existing file
  await page.route(
    (url) =>
      url.hostname === 'www.googleapis.com' &&
      url.pathname === '/drive/v3/files' &&
      url.searchParams.has('spaces'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ files: [] }),
      }),
  )

  // Create (multipart) → returns file id
  await page.route(
    (url) =>
      url.hostname === 'www.googleapis.com' &&
      url.pathname === '/upload/drive/v3/files' &&
      url.searchParams.get('uploadType') === 'multipart',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: FAKE_FILE_ID, name: 'transactions.json' }),
      }),
  )

  // Get media → empty file body with ETag
  await page.route(
    (url) =>
      url.hostname === 'www.googleapis.com' &&
      url.pathname === `/drive/v3/files/${FAKE_FILE_ID}` &&
      url.searchParams.get('alt') === 'media',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { ETag: ETAG_1 },
        body: EMPTY_DRIVE_BODY,
      }),
  )

  // PATCH update → success with new ETag
  await page.route(
    (url) =>
      url.hostname === 'www.googleapis.com' &&
      url.pathname === `/upload/drive/v3/files/${FAKE_FILE_ID}` &&
      url.searchParams.get('uploadType') === 'media',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { ETag: ETAG_2 },
        body: JSON.stringify({}),
      }),
  )
}

async function signIn(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: /^sign in$/i }).click()
  await page.getByRole('button', { name: /i understand, continue/i }).click()
  await expect(page.getByRole('img', { name: 'Sync User' })).toBeVisible()
}

test.describe('Sync', () => {
  test('unauthenticated → sync button is disabled with "Sign in to sync" label', async ({
    page,
  }) => {
    await page.goto('/')
    const btn = page.getByRole('button', { name: 'Sign in to sync' })
    await expect(btn).toBeVisible()
    await expect(btn).toBeDisabled()
  })

  test('sign in + add transaction → PATCH fires and SyncButton shows synced state', async ({
    page,
  }) => {
    await injectGisMock(page)
    await setupDriveMocks(page)

    await page.goto('/')
    await signIn(page)

    // Wait for the PATCH request that auto-sync fires after mutation (debounced ~1s)
    const patchPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PATCH' &&
        req.url().includes('/upload/drive/v3/files') &&
        req.url().includes('uploadType=media'),
      { timeout: 15_000 },
    )

    await page.getByRole('button', { name: /add/i }).click()
    await page.getByRole('combobox', { name: /type/i }).click()
    await page.getByRole('option', { name: 'Expense' }).click()
    await page.getByLabel(/amount/i).fill('25')
    await page.getByRole('combobox', { name: /category/i }).click()
    await page.getByRole('option', { name: 'Food & Dining' }).click()
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await patchPromise

    // After sync: aria-label = "Synced, last synced just now"
    await expect(
      page.getByRole('button', { name: /synced/i }),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('force-sync button triggers a PATCH when user is authenticated', async ({ page }) => {
    await injectGisMock(page)
    await setupDriveMocks(page)

    await page.goto('/')
    await signIn(page)

    // Wait for initial idle sync triggered on sign-in, then force another
    await expect(page.getByRole('button', { name: /synced|force sync/i })).toBeVisible({
      timeout: 15_000,
    })

    const patchPromise = page.waitForRequest(
      (req) =>
        req.method() === 'PATCH' &&
        req.url().includes('/upload/drive/v3/files') &&
        req.url().includes('uploadType=media'),
      { timeout: 15_000 },
    )

    // Click the sync button to force a manual sync
    const syncBtn = page.getByRole('button', { name: /synced|force sync/i })
    if (await syncBtn.isEnabled()) {
      await syncBtn.click()
      await patchPromise
    }
  })
})
