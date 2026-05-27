import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import DashboardLayout from './dashboard/DashboardLayout'

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/login')
    }

    const adminSupabase = await createAdminClient()
    const [{ data: userData }, { data: restaurant }] = await Promise.all([
        adminSupabase.from('users').select('full_name').eq('id', user.id).single(),
        adminSupabase.from('restaurants').select('name').eq('id', user.restaurantId).single(),
    ])

    return (
        <DashboardLayout
            restaurantName={restaurant?.name || 'Your Restaurant'}
            userName={userData?.full_name || user.email}
        >
            {children}
        </DashboardLayout>
    )
}
