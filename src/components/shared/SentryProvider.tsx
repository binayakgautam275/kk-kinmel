'use client'

import { useEffect } from 'react'
import { initSentryClient } from '@/lib/sentry.client.config'

/**
 * Client-side Sentry initializer
 * Initializes error tracking on the client
 * 
 * User context will be set in auth flow (login/logout actions)
 */
export function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Sentry on client
    initSentryClient()
  }, [])

  return <>{children}</>
}
