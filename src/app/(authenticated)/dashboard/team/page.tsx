import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import TeamManager from './TeamManager'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const { data: staff } = await adminSupabase
        .from('users')
        .select('id, full_name, email, role, created_at, is_active')
        .eq('restaurant_id', restaurantId)
        .neq('role_id', 5)
        .order('created_at', { ascending: false })

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Team</h1>
                <p className="text-sm text-gray-500 mt-1">Manage staff access to kitchen and waiter portals.</p>
            </div>
            <TeamManager initialStaff={staff || []} />
        </div>
    )
}
