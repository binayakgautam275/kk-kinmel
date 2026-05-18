/**
 * Sentry Client-Side Configuration
 * Handles error tracking for browser/client errors and component crashes
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

export function initSentryClient() {
  if (!SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured. Error tracking disabled.')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring: 10% of transactions in prod, 100% in dev
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Show debug info in development
    debug: process.env.NODE_ENV !== 'production',

    // Replay configuration
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Always capture replays for errors

    // Security: Don't send personal data
    beforeSend(event) {
      // Remove sensitive data from errors
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers
      }

      // Remove email/password from error messages
      if (event.message) {
        event.message = event.message.replace(
          /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
          '[EMAIL]'
        )
      }

      return event
    },

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

    // Ignore known harmless errors
    ignoreErrors: [
      // Browser extensions
      'chrome-extension://',
      'moz-extension://',
      // Network errors (not our fault)
      'NetworkError',
      // Random spam
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
    ],
  })
}
