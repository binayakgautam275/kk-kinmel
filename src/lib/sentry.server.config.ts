/**
 * Sentry Server-Side Configuration
 * Handles error tracking for API routes and server components
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN

export function initSentryServer() {
  if (!SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured. Error tracking disabled.')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    debug: process.env.SENTRY_DEBUG === 'true',

    // Security: Don't send personal data
    beforeSend(event) {
      // Remove email/PII from breadcrumbs
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers
      }

      // Remove sensitive query params
      if (event.request?.url) {
        event.request.url = event.request.url.replace(
          /([?&](key|token|secret|password|apikey)=)[^&]*/gi,
          '$1[REDACTED]'
        )
      }

      return event
    },

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',
  })
}
