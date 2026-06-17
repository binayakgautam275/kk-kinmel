'use server'

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { Settings, Restaurant } from '@/types/database'

/**
 * Fetch features_v2 flags for a restaurant.
 * Cached for 30 seconds across requests — features change rarely and this
 * was previously hitting the DB on every kitchen/waiter/admin page load.
 */
export const getRestaurantFeatures = unstable_cache(
    async (restaurantId: string): Promise<Settings['features_v2'] | null> => {
        const supabase = await createAdminClient()
        const { data } = await supabase
            .from('settings')
            .select('features_v2')
            .eq('restaurant_id', restaurantId)
            .single()
        return data?.features_v2 ?? null
    },
    ['restaurant-features'],
    { revalidate: 30 }
)

/**
 * Fetch restaurant with SaaS/Nepal fields for settings pages.
 */
export async function getRestaurantFull(restaurantId: string): Promise<Restaurant | null> {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single()
    return data
}

/**
 * Check plan limit before creating a resource.
 */
export async function checkPlanLimit(restaurantId: string, resource: 'menu_items' | 'staff' | 'tables') {
    const supabase = await createAdminClient()
    const { data, error } = await supabase.rpc('check_plan_limit', {
        p_restaurant_id: restaurantId,
        p_resource: resource,
    })
    if (error) return { allowed: true, reason: 'Could not check limit' }
    return data as { allowed: boolean; current?: number; max?: number; tier?: string; reason: string }
}

/**
 * Update features_v2 flags (admin only).
 */
export async function updateFeaturesAction(restaurantId: string, features: Partial<Settings['features_v2']>) {
    const supabase = await createAdminClient()

    // Merge with existing features
    const { data: existing } = await supabase
        .from('settings')
        .select('features_v2')
        .eq('restaurant_id', restaurantId)
        .single()

    const merged = { ...(existing?.features_v2 || {}), ...features }

    const { error } = await supabase
        .from('settings')
        .update({ features_v2: merged })
        .eq('restaurant_id', restaurantId)

    if (error) return { error: error.message }
    return { success: true }
}
