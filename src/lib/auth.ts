// lib/auth.ts
// Unified role resolution helper — replaces the 10-line auth pattern
// duplicated across every admin/staff page.
'use server'

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { getJwtClaims } from '@/lib/supabase/jwt'
import { redirect } from 'next/navigation'
import type { RoleName } from '@/types/database'

export interface CurrentUser {
    id: string
    email: string
    restaurantId: string
    role: RoleName
}

/**
 * Get the current authenticated user with role and restaurant_id.
 *
 * Strategy:
 *  1. First try JWT custom claims (no DB roundtrip — set by 004_jwt_claims_hook.sql)
 *  2. Fall back to admin DB lookup if claims are missing (e.g. token not yet refreshed)
 *
 * Redirects to /login if not authenticated, /unauthorized if no restaurant,
 * /suspended if the restaurant has been auto-suspended.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const adminSupabase = await createAdminClient()

    // Try JWT claims first (fast path — no DB call for role)
    const claims = await getJwtClaims()
    if (claims?.restaurant_id && claims?.app_role) {
        const { data: rest } = await adminSupabase
            .from('restaurants')
            .select('is_suspended, subscription_expires_at, subscription_status')
            .eq('id', claims.restaurant_id)
            .single()

        // Lazy auto-suspend: if subscription lapsed and not yet suspended, do it now
        if (
            rest &&
            !rest.is_suspended &&
            rest.subscription_expires_at &&
            new Date(rest.subscription_expires_at) < new Date() &&
            rest.subscription_status !== 'suspended' &&
            rest.subscription_status !== 'cancelled'
        ) {
            await adminSupabase
                .from('restaurants')
                .update({ is_suspended: true, subscription_status: 'suspended' })
                .eq('id', claims.restaurant_id)
            redirect('/suspended')
        }

        if (rest?.is_suspended) redirect('/suspended')

        return {
            id: user.id,
            email: user.email || '',
            restaurantId: claims.restaurant_id,
            role: claims.app_role as RoleName,
        }
    }

    // Fallback: admin DB lookup (needed when JWT hasn't refreshed yet)
    const { data: userData } = await adminSupabase
        .from('users')
        .select('restaurant_id, roles(name), restaurants(is_suspended, subscription_expires_at, subscription_status)')
        .eq('id', user.id)
        .single()

    if (!userData?.restaurant_id) {
        redirect('/unauthorized')
    }

    const restaurant = userData.restaurants as unknown as {
        is_suspended?: boolean
        subscription_expires_at?: string | null
        subscription_status?: string
    } | null

    // Lazy auto-suspend on fallback path too
    if (
        restaurant &&
        !restaurant.is_suspended &&
        restaurant.subscription_expires_at &&
        new Date(restaurant.subscription_expires_at) < new Date() &&
        restaurant.subscription_status !== 'suspended' &&
        restaurant.subscription_status !== 'cancelled'
    ) {
        await adminSupabase
            .from('restaurants')
            .update({ is_suspended: true, subscription_status: 'suspended' })
            .eq('id', userData.restaurant_id)
        redirect('/suspended')
    }

    const isSuspended = restaurant?.is_suspended
    if (isSuspended) redirect('/suspended')

    const roleName = (userData.roles as unknown as { name: string } | null)?.name || 'waiter'

    return {
        id: user.id,
        email: user.email || '',
        restaurantId: userData.restaurant_id,
        role: roleName as RoleName,
    }
}

/**
 * Require a specific role (or set of roles).
 * Redirects to /unauthorized if the user doesn't have the required role.
 */
export async function requireRole(...allowedRoles: RoleName[]): Promise<CurrentUser> {
    const currentUser = await getCurrentUser()

    if (!allowedRoles.includes(currentUser.role)) {
        redirect('/unauthorized')
    }

    return currentUser
}

/**
 * Lightweight auth check — returns CurrentUser or null (no redirect).
 * Useful for the root `/` page where we want to check without forcing login.
 */
export async function getOptionalUser(): Promise<CurrentUser | null> {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Try JWT claims first
    const claims = await getJwtClaims()
    if (claims?.restaurant_id && claims?.app_role) {
        return {
            id: user.id,
            email: user.email || '',
            restaurantId: claims.restaurant_id,
            role: claims.app_role as RoleName,
        }
    }

    // Fallback DB lookup
    const adminSupabase = await createAdminClient()
    const { data: userData } = await adminSupabase
        .from('users')
        .select('restaurant_id, roles(name)')
        .eq('id', user.id)
        .single()

    if (!userData?.restaurant_id) return null

    const roleName = (userData.roles as unknown as { name: string } | null)?.name || 'waiter'

    return {
        id: user.id,
        email: user.email || '',
        restaurantId: userData.restaurant_id,
        role: roleName as RoleName,
    }
}
