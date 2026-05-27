import { ReactNode } from 'react'
import KitchenLayoutClient from '@/components/kitchen/KitchenLayoutClient'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

export default async function KitchenLayout({ children }: { children: ReactNode }) {
    const { id: userId, restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const [{ data: user }, { data: restaurant }, { data: settings }] = await Promise.all([
        adminSupabase.from('users').select('full_name').eq('id', userId).single(),
        adminSupabase.from('restaurants').select('name').eq('id', restaurantId).single(),
        adminSupabase.from('settings').select('features_v2').eq('restaurant_id', restaurantId).single(),
    ])

    const notificationSoundUrl = (settings?.features_v2 as Record<string, unknown> | null)?.notificationSoundUrl as string | null | undefined

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
