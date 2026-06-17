import { ReactNode } from 'react'
import KitchenLayoutClient from '@/components/kitchen/KitchenLayoutClient'
import { getCurrentUser } from '@/lib/auth'
import { getRestaurantFeatures } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase/server'

export default async function KitchenLayout({ children }: { children: ReactNode }) {
    const { id: userId, restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    // Run user/restaurant name lookups and features in parallel.
    // getRestaurantFeatures is cached (30s) — the page's own call hits the cache.
    const [{ data: user }, { data: restaurant }, features] = await Promise.all([
        adminSupabase.from('users').select('full_name').eq('id', userId).single(),
        adminSupabase.from('restaurants').select('name').eq('id', restaurantId).single(),
        getRestaurantFeatures(restaurantId),
    ])

    const notificationSoundUrl = (features as Record<string, unknown> | null)?.notificationSoundUrl as string | null | undefined

    return (
        <KitchenLayoutClient
            restaurantName={restaurant?.name || undefined}
            staffName={user?.full_name || undefined}
            notificationSoundUrl={notificationSoundUrl || null}
        >
            {children}
        </KitchenLayoutClient>
    )
}
