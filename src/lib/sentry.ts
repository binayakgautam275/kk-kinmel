/**
 * Sentry Utility Functions
 * Use these to manually track errors, events, and performance
 */

import * as Sentry from '@sentry/nextjs'

/**
 * Capture an error with additional context
 * @param error - The error to capture
 * @param context - Additional context (user ID, restaurant ID, etc.)
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  console.error('Error captured:', error, context)

  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  })
}

/**
 * Set user context for error tracking
 * Call this after user login to tag all subsequent errors with the user
 */
export function setSentryUser(userId: string, email?: string, role?: string) {
  Sentry.setUser({
    id: userId,
    email,
    username: role,
  })
}

/**
 * Set restaurant context for multi-tenant error tracking
 */
export function setSentryRestaurant(restaurantId: string, restaurantName?: string) {
  Sentry.setTag('restaurant_id', restaurantId)
  if (restaurantName) {
    Sentry.setTag('restaurant_name', restaurantName)
  }
}

/**
 * Clear user context (call on logout)
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}

/**
 * Capture a message (for logging important events, not errors)
 */
export function logEvent(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level)
}

/**
 * Set custom tag on all future errors
 */
export function setTag(key: string, value: string | number | boolean) {
  Sentry.setTag(key, value)
}

/**
 * Add breadcrumb (for debugging, shows up in error context)
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category?: string
) {
  Sentry.addBreadcrumb({
    message,
    data,
    category: category || 'custom',
    level: 'info',
  })
}
