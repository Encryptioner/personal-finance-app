import { test, expect } from '@playwright/test'

/**
 * Transaction CRUD and filtering — local-only (IndexedDB, no Drive mocking).
 */
test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Transactions')
  })

  test('add an income transaction → row appears in list', async ({ page }) => {
    await page.getByRole('button', { name: /add/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('combobox', { name: /type/i }).click()
    await page.getByRole('option', { name: 'Income' }).click()

    await page.getByLabel(/amount/i).fill('100')

    await page.getByRole('combobox', { name: /category/i }).click()
    await page.getByRole('option', { name: 'Salary' }).click()

    await page.getByLabel(/description/i).fill('Test income entry')

    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByText('Salary').first()).toBeVisible()
  })

  test('edit a transaction → row reflects updated amount', async ({ page }) => {
    // Add first
    await page.getByRole('button', { name: /add/i }).click()
    await page.getByRole('combobox', { name: /type/i }).click()
    await page.getByRole('option', { name: 'Income' }).click()
    await page.getByLabel(/amount/i).fill('100')
    await page.getByRole('combobox', { name: /category/i }).click()
    await page.getByRole('option', { name: 'Salary' }).click()
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Salary').first()).toBeVisible()

    // Edit
    await page.getByRole('button', { name: /edit/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const amountInput = page.getByLabel(/amount/i)
    await amountInput.clear()
    await amountInput.fill('150')

    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByText(/150/).first()).toBeVisible()
  })

  test('delete a transaction → row disappears', async ({ page }) => {
    // Add
    await page.getByRole('button', { name: /add/i }).click()
    await page.getByRole('combobox', { name: /type/i }).click()
    await page.getByRole('option', { name: 'Expense' }).click()
    await page.getByLabel(/amount/i).fill('50')
    await page.getByRole('combobox', { name: /category/i }).click()
    await page.getByRole('option', { name: 'Food & Dining' }).click()
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Food & Dining').first()).toBeVisible()

    // Delete
    await page.getByRole('button', { name: /delete/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /^delete$/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    await expect(page.getByText('Food & Dining')).not.toBeVisible()
  })

  test('transactions persist after page reload (IndexedDB)', async ({ page }) => {
    await page.getByRole('button', { name: /add/i }).click()
    await page.getByRole('combobox', { name: /type/i }).click()
    await page.getByRole('option', { name: 'Income' }).click()
    await page.getByLabel(/amount/i).fill('777')
    await page.getByRole('combobox', { name: /category/i }).click()
    await page.getByRole('option', { name: 'Freelance' }).click()
    await page.getByLabel(/description/i).fill('Persistence check')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Freelance').first()).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Transactions')
    await expect(page.getByText('Freelance').first()).toBeVisible()
  })
})
