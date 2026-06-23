/**
 * Next.js client-side instrumentation hook (Next.js 15+/16)
 * Runs once in the browser before the app mounts — no React context needed.
 */
import * as Sentry from '@sentry/nextjs'
import { initSentryClient } from './src/lib/sentry.client.config'

export function register() {
    initSentryClient()
}

// Required by Next.js 16 so Sentry can instrument client-side route transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
