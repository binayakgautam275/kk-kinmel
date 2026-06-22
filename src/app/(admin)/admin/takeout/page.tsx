import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import TakeoutDashboard from './TakeoutDashboard'
import { TAKEOUT_ORDER_SELECT, mapOrderRowToTakeout, type TakeoutOrderRow } from '@/lib/takeout'

export const revalidate = 0

export default async function AdminTakeoutPage() {
    const { restaurantId: rid } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const { data: orderRows } = await adminSupabase
        .from('orders')
        .select(TAKEOUT_ORDER_SELECT)
        .eq('restaurant_id', rid)
        .eq('order_type', 'takeout')
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('placed_at', { ascending: false })
        .limit(50)

    const orders = ((orderRows || []) as unknown as TakeoutOrderRow[]).map(mapOrderRowToTakeout)

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Takeout Orders</h1>
                <p className="text-gray-500 mt-1">Manage pending and active takeout orders.</p>
            </div>
            <TakeoutDashboard initialOrders={orders} restaurantId={rid} />
        </div>
    )
}
