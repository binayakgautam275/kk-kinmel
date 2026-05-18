/**
 * API Route Error Handler Wrapper
 * Wraps API routes to catch errors and send to Sentry
 *
 * Usage:
 *   export const POST = withErrorHandler(async (req) => {
 *     // your code here
 *   })
 */

import { NextRequest } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export type ApiHandler = (
  req: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context?: any
) => Promise<Response>

export function withErrorHandler(handler: ApiHandler) {
  return async (req: NextRequest, context?: unknown) => {
    try {
      // Tag this request in Sentry
      Sentry.setTag('api.path', req.nextUrl.pathname)
      Sentry.setTag('api.method', req.method)
      Sentry.addBreadcrumb({
        message: `API ${req.method} ${req.nextUrl.pathname}`,
        category: 'api',
      })

      const response = await handler(req, context)

      // Log non-2xx status codes
      if (response.status >= 400) {
        Sentry.captureMessage(`API error: ${req.method} ${req.nextUrl.pathname} returned ${response.status}`, 'warning')
      }

      return response
    } catch (error) {
      // Log the error to Sentry
      Sentry.captureException(error, {
        tags: {
          'api.path': req.nextUrl.pathname,
          'api.method': req.method,
        },
      })

      console.error(`[API Error] ${req.method} ${req.nextUrl.pathname}:`, error)

      // Return error response
      return Response.json(
        {
          error: 'Internal server error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Auth error handler (401/403)
 */
export async function requireAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.split(' ')[1]

  if (!token) {
    Sentry.captureMessage(`Unauthorized access attempt: ${req.nextUrl.pathname}`, 'warning')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
