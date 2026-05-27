import { requireRole } from '@/lib/auth'
import { getAllEodReportsAcrossRestaurants, getAllRestaurants } from '../actions'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
    await requireRole('super_admin')

    const [reportsResult, restaurantsResult] = await Promise.all([
        getAllEodReportsAcrossRestaurants(200),
        getAllRestaurants(),
    ])

    const restaurants = (restaurantsResult.data || []).map((r: { id: string; name: string }) => ({ id: r.id, name: r.name }))

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">EOD Reports</h1>
                <p className="text-gray-500 mt-1 text-sm">End-of-day reports across all restaurant tenants.</p>
            </div>
            <ReportsClient reports={(reportsResult.data || []) as any} restaurants={restaurants} />
        </div>
    )
}
