import { test, expect, requireEnv, TEST_ENV } from './fixtures'

test.describe('QR Ordering Flow', () => {
    test('customer can browse menu and add items to cart', async ({ page }) => {
        const skip = requireEnv('tableSlug', 'sessionToken')
        if (skip) test.skip(true, skip)

        await page.goto(`/t/${TEST_ENV.tableSlug}?session=${TEST_ENV.sessionToken}`)
        await page.waitForLoadState('networkidle')

        // Menu page should render with at least one item
        await expect(page.locator('body')).not.toContainText('Error', { timeout: 10_000 })

        // Find and click the first "Add" button on any menu item
        const addButton = page.getByRole('button', { name: /^add$/i }).first()
        await addButton.waitFor({ timeout: 15_000 })
        await addButton.click()

        // Cart should reflect 1 item (badge or counter)
        await expect(page.getByText(/1 item|view cart/i).first()).toBeVisible({ timeout: 5_000 })
    })

    test('customer can proceed to checkout', async ({ page }) => {
        const skip = requireEnv('tableSlug', 'sessionToken')
        if (skip) test.skip(true, skip)

        await page.goto(`/t/${TEST_ENV.tableSlug}?session=${TEST_ENV.sessionToken}`)
        await page.waitForLoadState('networkidle')

        // Add item to cart
        const addButton = page.getByRole('button', { name: /^add$/i }).first()
        await addButton.waitFor({ timeout: 15_000 })
        await addButton.click()

        // Open cart / go to checkout
        const cartTrigger = page.getByRole('button', { name: /view cart|checkout|cart/i }).first()
        await cartTrigger.waitFor({ timeout: 5_000 })
        await cartTrigger.click()

        // Checkout page or cart drawer should show the item and a total
        await expect(page.getByText(/total|place order|confirm/i).first()).toBeVisible({ timeout: 8_000 })
    })
})
