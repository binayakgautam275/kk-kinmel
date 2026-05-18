/**
 * Next.js Instrumentation
 * This runs once when the server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { initSentryServer } from './src/lib/sentry.server.config'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    initSentryServer()
    console.log('✓ Sentry initialized (server-side)')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime doesn't support Sentry yet
  }
}
