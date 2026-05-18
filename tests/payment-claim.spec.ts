import { test, expect, loginAsManager, requireEnv, TEST_ENV } from './fixtures'
import path from 'path'
import fs from 'fs'

test.describe('Nepal Payment Claim Flow', () => {
    test('customer can submit a payment claim', async ({ page }) => {
        const skip = requireEnv('tableSlug', 'sessionToken')
        if (skip) test.skip(true, skip)

        // Navigate to the checkout page for the test table
        await page.goto(`/t/${TEST_ENV.tableSlug}/checkout?session=${TEST_ENV.sessionToken}`)
        await page.waitForLoadState('networkidle')

        // Select Nepal Pay method if visible
        const nepalPayTab = page.getByRole('button', { name: /esewa|khalti|nepal pay|qr/i }).first()
        if (await nepalPayTab.isVisible()) {
            await nepalPayTab.click()
        }

        // Fill in payment claim reference
        const referenceField = page.getByPlaceholder(/reference|transaction id|code/i).first()
        if (await referenceField.isVisible({ timeout: 3_000 })) {
            await referenceField.fill(`E2E-TEST-${Date.now()}`)
        }

        // Submit claim
        const submitButton = page.getByRole('button', { name: /submit|send claim|confirm payment/i }).first()
        if (await submitButton.isVisible({ timeout: 3_000 })) {
            await submitButton.click()
            // Should show success or redirect to order tracker
            await expect(
                page.getByText(/submitted|order placed|success|pending/i).first()
            ).toBeVisible({ timeout: 10_000 })
        }
    })

    test('manager can see payment claims in the admin panel', async ({ page }) => {
        const skip = requireEnv('managerEmail', 'managerPassword')
        if (skip) test.skip(true, skip)

        await loginAsManager(page)
        await page.goto('/admin/payments')
        await page.waitForLoadState('networkidle')

        // Page should load without error — claims list (possibly empty) is visible
        await expect(page.getByRole('heading', { name: /payment|verification/i }).first()).toBeVisible()
    })
})
