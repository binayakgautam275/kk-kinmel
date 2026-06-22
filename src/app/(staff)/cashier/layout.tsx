import { ReactNode } from 'react'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import WaiterLayoutClient from '@/components/waiter/WaiterLayoutClient'

export default async function CashierLayout({ children }: { children: ReactNode }) {
    const { id: userId, restaurantId } = await requireRole('waiter', 'manager', 'super_admin')
    const adminSupabase = await createAdminClient()

    const [{ data: user }, { data: restaurant }] = await Promise.all([
        adminSupabase.from('users').select('full_name').eq('id', userId).single(),
        adminSupabase.from('restaurants').select('name').eq('id', restaurantId).single(),
    ])

    return (
        <WaiterLayoutClient
            restaurantName={restaurant?.name || undefined}
            staffName={user?.full_name || undefined}
            notificationSoundUrl={null}
        >
            {children}
        </WaiterLayoutClient>
    )
}
