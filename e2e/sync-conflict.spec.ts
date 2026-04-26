import { test, expect, type Page } from '@playwright/test'

/**
 * ETag conflict (412) retry path.
 *
 * sync-service retries up to 5 times with exponential backoff on 412.
 * We mock PATCH to return 412 on the first call and 200 on the second,
 * then verify sync ultimately succeeds.
 *
 * Test timeout is 60s to accommodate the 1s exponential-backoff delay.
 */

const FAKE_FILE_ID = 'conflict-file'
const ETAG_1 = '"etag-conflict-1"'
const ETAG_2 = '"etag-conflict-2"'

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
                cfg.callback({ access_token: 'fake-token', expires_in: 3600 })
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

test.describe('Sync — 412 conflict retry', () => {
  test('PATCH 412 on first attempt is retried and sync succeeds without showing error', async ({
    page,
  }) => {
    test.setTimeout(60_000)
      await injectGisMock(page)

      await page.route('**/oauth2/v3/userinfo**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            email: 'conflict@example.com',
            name: 'Conflict User',
            picture: 'https://placehold.co/64x64.png',
          }),
        }),
      )

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

      await page.route(
        (url) =>
          url.hostname === 'www.googleapis.com' &&
          url.pathname === '/upload/drive/v3/files' &&
          url.searchParams.get('uploadType') === 'multipart',
        (route) =>
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: FAKE_FILE_ID }),
          }),
      )

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

      let patchCallCount = 0
      await page.route(
        (url) =>
          url.hostname === 'www.googleapis.com' &&
          url.pathname === `/upload/drive/v3/files/${FAKE_FILE_ID}` &&
          url.searchParams.get('uploadType') === 'media',
        (route) => {
          patchCallCount++
          if (patchCallCount === 1) {
            return route.fulfill({
              status: 412,
              contentType: 'application/json',
              body: JSON.stringify({ error: { message: 'Precondition Failed', code: 412 } }),
            })
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { ETag: ETAG_2 },
            body: JSON.stringify({}),
          })
        },
      )

      await page.goto('/')
      await page.getByRole('banner').getByRole('button', { name: /^sign in$/i }).click()
      await page.getByRole('button', { name: /i understand, continue/i }).click()
      await expect(page.getByRole('img', { name: 'Conflict User' })).toBeVisible()

      // Force a sync
      const syncBtn = page.getByRole('button', { name: /synced|force sync|syncing/i })
      await expect(syncBtn).toBeVisible({ timeout: 10_000 })

      // Wait for idle (the button becomes enabled after sync completes or errors)
      const forceSyncBtn = page.getByRole('button', { name: /force sync/i })
      if (await forceSyncBtn.isVisible()) {
        await forceSyncBtn.click()
      }

      // Sync should NOT end in error state
      await expect(
        page.getByRole('button', { name: /sync failed/i }),
      ).not.toBeVisible({ timeout: 30_000 })

      // Sync should reach synced state
      await expect(
        page.getByRole('button', { name: /synced/i }),
      ).toBeVisible({ timeout: 30_000 })

      // Verify PATCH was retried (412 first, then success)
      expect(patchCallCount).toBeGreaterThanOrEqual(2)
    },
  )
})
