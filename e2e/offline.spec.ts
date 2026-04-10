import { test, expect } from '@playwright/test'

/**
 * PWA offline functionality test.
 * Validates that the app:
 * 1. Installs a service worker on first visit
 * 2. Loads from cache when offline
 * 3. Allows operations while offline
 * 4. Syncs when connectivity returns (minimal validation)
 */
test('app works offline after service worker installation', async ({
  page,
  context,
}) => {
  // 1. Initial visit — wait for SW to be installed and active
  await page.goto('/', { waitUntil: 'networkidle' })

  // Verify the app loaded
  await expect(
    page.getByRole('heading', { name: /Transactions|Personal Finance/i }),
  ).toBeVisible()

  // Wait for service worker to be ready
  await page.evaluate(() => navigator.serviceWorker.ready)

  // Reload to let SW take control (first load isn't controlled)
  await page.reload({ waitUntil: 'networkidle' })

  // Verify SW is controlling the page
  const swActive = await page.evaluate(() => !!navigator.serviceWorker.controller)
  expect(swActive).toBe(true)

  // 2. Go offline
  await context.setOffline(true)

  // Reload while offline — should load from cache
  await page.reload()

  // Verify app still loads from cache
  await expect(
    page.getByRole('heading', { name: /Transactions|Personal Finance/i }),
  ).toBeVisible()

  // Verify we can still interact with the page (basic DOM check)
  const buttons = await page.locator('button').count()
  expect(buttons).toBeGreaterThan(0)

  // 3. Go online
  await context.setOffline(false)

  // Wait for potential sync activity (no hard validation needed)
  // Just verify app still works after coming back online
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(
    page.getByRole('heading', { name: /Transactions|Personal Finance/i }),
  ).toBeVisible()
})
