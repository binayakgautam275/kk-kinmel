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
 * Extracts custom claims (app_role, restaurant_id) from the current user's JWT.
 * This avoids an admin DB roundtrip — the data is already embedded in the access token
 * by the custom_access_token_hook function.
 */
export async function getJwtClaims(): Promise<JwtClaims | null> {
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) return null

    try {
        // Decode the JWT payload (middle segment)
        const payload = JSON.parse(
            Buffer.from(session.access_token.split('.')[1], 'base64').toString('utf-8')
        )
        return {
            app_role: payload.app_role ?? undefined,
            restaurant_id: payload.restaurant_id ?? undefined,
            session_token: payload.session_token ?? undefined,
        }
    } catch (error) {
        console.error('Failed to decode JWT claims:', error)
        return null
    }
}
