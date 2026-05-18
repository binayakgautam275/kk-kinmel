import { requireRole } from '@/lib/auth'
import SuperAdminDashboard from './SuperAdminDashboard'
import { getAllRestaurants, getSaasMetrics } from './actions'

export const dynamic = 'force-dynamic'

interface Restaurant {
    id: string
    name: string
    slug: string
    is_active: boolean
    is_suspended: boolean
    subscription_tier: string
    max_staff: number
    max_menu_items: number
    created_at: string
    users?: { email: string } | null
}

export default async function SuperAdminPage() {
    // Only super_admin can access this page
    await requireRole('super_admin')

    // Fetch all restaurants + metrics
    const [restaurantsResult, metrics] = await Promise.all([
        getAllRestaurants(),
        getSaasMetrics(),
    ])

    if (restaurantsResult.error) {
        console.error('Failed to load restaurants:', restaurantsResult.error)
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">SaaS Control Panel</h1>
                <p className="text-gray-500 mt-1">Manage all restaurant tenants, subscriptions, and platform metrics</p>
            </header>

            <SuperAdminDashboard
                restaurants={(restaurantsResult.data || []) as Restaurant[]}
                metrics={metrics}
            />
        </div>
    )
}
