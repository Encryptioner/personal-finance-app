import { test, expect, type Page } from '@playwright/test'

/**
 * Inject window.google before any app scripts run.
 * - Silent flow (prompt:'') → returns error so silentSignIn stays idle (normal first-visit)
 * - Interactive flow → returns fake access token immediately
 * - revoke → calls callback synchronously
 */
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

async function mockUserInfo(page: Page) {
  await page.route('**/oauth2/v3/userinfo**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://placehold.co/64x64.png',
      }),
    }),
  )
}

test.describe('Authentication', () => {
  test('app opens directly on Transactions — no auth gate', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Transactions')
    await expect(page.getByRole('button', { name: /add/i })).toBeVisible()
  })

  test('"Sign in" banner is visible for unauthenticated users', async ({ page }) => {
    await page.goto('/')
    // SignInBanner has role="banner" and contains a "Sign in" button
    await expect(page.getByRole('banner').getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })

  test('sign in via mock GIS → consent dialog → banner disappears, avatar appears', async ({
    page,
  }) => {
    await injectGisMock(page)
    await mockUserInfo(page)

    await page.goto('/')
    await expect(page.getByRole('banner').getByRole('button', { name: /^sign in$/i })).toBeVisible()

    // Open consent dialog
    await page.getByRole('banner').getByRole('button', { name: /^sign in$/i }).click()
    // Dialog title: "Before you sign in" (from MESSAGES.consent.title)
    await expect(page.getByRole('dialog', { name: /before you sign in/i })).toBeVisible()

    // Confirm — triggers GIS interactive flow
    await page.getByRole('button', { name: /i understand, continue/i }).click()

    // Banner gone
    await expect(page.getByRole('banner').getByRole('button', { name: /^sign in$/i })).not.toBeVisible()

    // Profile avatar (img alt = profile.name)
    await expect(page.getByRole('img', { name: 'Test User' })).toBeVisible()
  })

  test('sign out → sign-in banner reappears', async ({ page }) => {
    await injectGisMock(page)
    await mockUserInfo(page)

    await page.goto('/')
    await page.getByRole('banner').getByRole('button', { name: /^sign in$/i }).click()
    await page.getByRole('button', { name: /i understand, continue/i }).click()
    await expect(page.getByRole('img', { name: 'Test User' })).toBeVisible()

    // Open profile menu
    await page.getByRole('img', { name: 'Test User' }).click()
    // Sign out button inside the dropdown
    await page.getByRole('button', { name: /sign out/i }).click()

    // Banner reappears
    await expect(page.getByRole('banner').getByRole('button', { name: /^sign in$/i })).toBeVisible()
  })
})
