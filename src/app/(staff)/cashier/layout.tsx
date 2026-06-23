import { ReactNode } from 'react'
import { requireRole } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyClientIp } from '@/lib/ip-check'
import { redirect } from 'next/navigation'
import WaiterLayoutClient from '@/components/waiter/WaiterLayoutClient'

export default async function CashierLayout({ children }: { children: ReactNode }) {
    const { id: userId, restaurantId, role } = await requireRole('waiter', 'manager', 'super_admin')

    // Enforce WiFi IP check for staff
    const { allowed } = await verifyClientIp(restaurantId, role)
    if (!allowed) {
        redirect('/wifi-required?redirect=/cashier')
    }
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
