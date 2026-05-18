import { test, expect, requireEnv, TEST_ENV } from './fixtures'

test.describe('Takeout Order Flow', () => {
    test('customer can browse takeout menu', async ({ page }) => {
        const skip = requireEnv('takeoutSlug')
        if (skip) test.skip(true, skip)

        // Takeout is accessible at /takeout/{slug} or /t/{slug}?mode=takeout
        await page.goto(`/takeout/${TEST_ENV.takeoutSlug}`)
        await page.waitForLoadState('networkidle')

        // Should show menu without auth errors
        await expect(page.locator('body')).not.toContainText('404', { timeout: 8_000 })
        await expect(page.locator('body')).not.toContainText('not found', { timeout: 3_000 })
    })

    test('customer can add a takeout item and reach checkout', async ({ page }) => {
        const skip = requireEnv('takeoutSlug')
        if (skip) test.skip(true, skip)

        await page.goto(`/takeout/${TEST_ENV.takeoutSlug}`)
        await page.waitForLoadState('networkidle')

        // Add first available item
        const addButton = page.getByRole('button', { name: /^add$/i }).first()
        await addButton.waitFor({ timeout: 15_000 })
        await addButton.click()

        // Proceed to checkout
        const checkoutButton = page.getByRole('button', { name: /checkout|view cart|place order/i }).first()
        await checkoutButton.waitFor({ timeout: 5_000 })
        await checkoutButton.click()

        // Checkout should show pickup time / phone fields
        await expect(
            page.getByText(/pickup|phone|contact/i).first()
        ).toBeVisible({ timeout: 10_000 })
    })
})
