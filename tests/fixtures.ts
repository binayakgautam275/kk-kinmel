import { test as base, type Page } from '@playwright/test'

// Env vars — set these in .env.test or CI secrets
export const TEST_ENV = {
    managerEmail:    process.env.E2E_MANAGER_EMAIL    ?? '',
    managerPassword: process.env.E2E_MANAGER_PASSWORD ?? '',
    tableSlug:       process.env.E2E_TABLE_SLUG       ?? '',
    sessionToken:    process.env.E2E_SESSION_TOKEN    ?? '',
    takeoutSlug:     process.env.E2E_TAKEOUT_SLUG     ?? process.env.E2E_TABLE_SLUG ?? '',
}

export async function loginAsManager(page: Page) {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_ENV.managerEmail)
    await page.getByLabel(/password/i).fill(TEST_ENV.managerPassword)
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 })
}

// Skip the test if any required env vars are missing
export function requireEnv(...keys: (keyof typeof TEST_ENV)[]) {
    for (const key of keys) {
        if (!TEST_ENV[key]) {
            return `Skipped: E2E_${key.replace(/([A-Z])/g, '_$1').toUpperCase()} not set`
        }
    }
    return null
}

export const test = base
export { expect } from '@playwright/test'
