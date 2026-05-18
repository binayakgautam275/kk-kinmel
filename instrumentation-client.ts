/**
 * Next.js client-side instrumentation hook (Next.js 15+/16)
 * Runs once in the browser before the app mounts — no React context needed.
 */
import { initSentryClient } from './src/lib/sentry.client.config'

export function register() {
    initSentryClient()
}
