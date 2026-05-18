import { test, expect, loginAsManager, requireEnv, TEST_ENV } from './fixtures'

test.describe('Admin — Menu Management', () => {
    test.beforeEach(async ({ page }) => {
        const skip = requireEnv('managerEmail', 'managerPassword')
        if (skip) return test.skip()
        await loginAsManager(page)
    })

    test('add a menu category', async ({ page }) => {
        const skip = requireEnv('managerEmail', 'managerPassword')
        if (skip) test.skip(true, skip)

        await page.goto('/admin/menu')
        await page.waitForLoadState('networkidle')

        // Open add-category form
        await page.getByRole('button', { name: /add category|new category/i }).first().click()

        const categoryName = `E2E Category ${Date.now()}`
        await page.getByPlaceholder(/category name|name/i).first().fill(categoryName)
        await page.getByRole('button', { name: /save|create|add/i }).last().click()

        // Category should appear in the list
        await expect(page.getByText(categoryName)).toBeVisible({ timeout: 10_000 })
    })

    test('add a menu item and verify it appears on the public menu', async ({ page }) => {
        const skip = requireEnv('managerEmail', 'managerPassword', 'tableSlug')
        if (skip) test.skip(true, skip)

        await page.goto('/admin/menu')
        await page.waitForLoadState('networkidle')

        // Open add-item form (click the first "Add Item" button in any category)
        await page.getByRole('button', { name: /add item|new item/i }).first().click()

        const itemName = `E2E Item ${Date.now()}`
        await page.getByPlaceholder(/item name|name/i).fill(itemName)
        await page.getByPlaceholder(/price/i).fill('99')
        await page.getByRole('button', { name: /save|create|add/i }).last().click()

        // Item should appear in the admin menu list
        await expect(page.getByText(itemName)).toBeVisible({ timeout: 10_000 })

        // Navigate to public menu and verify item is visible
        await page.goto(`/t/${TEST_ENV.tableSlug}`)
        await page.waitForLoadState('networkidle')
        await expect(page.getByText(itemName)).toBeVisible({ timeout: 15_000 })
    })
})
