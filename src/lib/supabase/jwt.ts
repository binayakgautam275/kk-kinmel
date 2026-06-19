// lib/supabase/jwt.ts
// Utility to extract custom claims from the Supabase JWT
// These claims are injected by 004_jwt_claims_hook.sql

import { createServerClient } from './server'

export interface JwtClaims {
    app_role?: string
    restaurant_id?: string
    session_token?: string
}

/**
 * Extracts custom claims (app_role, restaurant_id, session_token) from the current
 * user's JWT — embedded in the access token by the custom_access_token_hook.
 *
 * Uses supabase.auth.getClaims(), which verifies the token signature before
 * returning its claims. Unlike a raw base64 decode of the cookie, a tampered
 * token is rejected here instead of being trusted for authorization.
 */
export async function getJwtClaims(): Promise<JwtClaims | null> {
    const supabase = await createServerClient()

    try {
        const { data } = await supabase.auth.getClaims()
        const claims = data?.claims as Record<string, unknown> | undefined
        if (!claims) return null

        return {
            app_role: typeof claims.app_role === 'string' ? claims.app_role : undefined,
            restaurant_id: typeof claims.restaurant_id === 'string' ? claims.restaurant_id : undefined,
            session_token: typeof claims.session_token === 'string' ? claims.session_token : undefined,
        }
    } catch (error) {
        console.error('Failed to read JWT claims:', error)
        return null
    }
}
