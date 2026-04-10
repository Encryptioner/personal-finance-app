import { test, expect } from '@playwright/test'

test('app loads with heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Personal Finance App',
  )
})
