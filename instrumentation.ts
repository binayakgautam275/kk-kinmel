/**
 * Next.js Instrumentation
 * This runs once when the server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { initSentryServer } from './src/lib/sentry.server.config'

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
]

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fail fast in production if critical env vars are missing
    if (process.env.NODE_ENV === 'production') {
      for (const key of REQUIRED_ENV_VARS) {
        if (!process.env[key]) {
          throw new Error(`Missing required environment variable: ${key}`)
        }
      }
    }

    initSentryServer()
    console.log('✓ Sentry initialized (server-side)')
  }
}
