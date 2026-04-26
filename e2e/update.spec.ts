import { test, expect } from '@playwright/test'

/**
 * Service Worker update prompt tests.
 *
 * The UpdatePrompt component (src/shared/ui/UpdatePrompt.tsx) renders a
 * role="alert" banner with "New version available" when useUpdatePrompt()
 * returns needsUpdate=true. That hook calls useRegisterSW() from the
 * vite-plugin-pwa virtual module, which sets needRefresh[0]=true when a
 * new SW enters the `waiting` state.
 *
 * LIMITATION: We cannot deploy two real versions in E2E. The virtual module
 * is bundled at build time and its internal state cannot be mutated from
 * page.evaluate(). The reliable E2E assertion is therefore limited to:
 *   1. SW registration and control (pre-condition).
 *   2. The UpdatePrompt NOT being shown on a clean load (no update pending).
 *
 * For testing the banner render logic itself, use a Vitest RTL component test
 * that mocks useUpdatePrompt() — that is the correct layer for unit-testing
 * the banner's conditional render.
 */

test.describe('Service Worker lifecycle', () => {
  test('SW is active and UpdatePrompt is not shown on a clean load', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })

    // Wait for SW to be ready
    const swReady = await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))
    expect(swReady).toBe(true)

    // Reload so SW takes control
    await page.reload({ waitUntil: 'networkidle' })

    const isControlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)
    expect(isControlled).toBe(true)

    // No update is pending on a clean load — UpdatePrompt should be absent
    await expect(page.getByRole('alert')).not.toBeVisible()
  })

  test('UpdatePrompt renders and offers a reload button when triggered via custom event', async ({
    page,
  }) => {
    /**
     * vite-plugin-pwa v0.17+ fires a custom 'vite-pwa:sw-update' event on
     * the window when it detects a waiting SW, which causes useRegisterSW
     * to set needRefresh[0] = true, which causes UpdatePrompt to render.
     *
     * We dispatch this event directly to simulate the update scenario without
     * needing to deploy two real app versions. If the plugin version in use
     * changes this event name, update accordingly.
     */
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload({ waitUntil: 'networkidle' })
    await page.evaluate(() => navigator.serviceWorker.ready)

    // Dispatch the event that vite-plugin-pwa uses to signal a waiting SW
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('vite-pwa:sw-update'))
    })

    // The UpdatePrompt (role="alert") should become visible
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 5_000 })
    await expect(alert).toContainText(/new version available/i)

    // The reload button must also be present
    await expect(page.getByRole('button', { name: /reload to update/i })).toBeVisible()
  })
})
