import { requireRole } from '@/lib/auth'
import { getAllRestaurants, getSaasMetrics } from '../actions'
import SuperAdminDashboard from '../SuperAdminDashboard'

export const dynamic = 'force-dynamic'

interface Restaurant {
    id: string
    name: string
    slug: string
    is_active: boolean
    is_suspended: boolean
    subscription_tier: string
    subscription_status: string
    subscription_expires_at: string | null
    max_staff: number
    max_menu_items: number
    created_at: string
    users?: { email: string } | null
}

export default async function RestaurantsPage() {
    await requireRole('super_admin')

    const [restaurantsResult, metrics] = await Promise.all([
        getAllRestaurants(),
        getSaasMetrics(),
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold text-gray-900">Restaurants</h1>
                <p className="text-gray-500 mt-1 text-sm">Create, suspend, and manage all restaurant tenants and their subscriptions.</p>
            </div>

            <SuperAdminDashboard
                restaurants={(restaurantsResult.data || []) as Restaurant[]}
                metrics={metrics}
            />
        </div>
    )
}
