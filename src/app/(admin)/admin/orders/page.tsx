import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import OrdersClient, { type AdminOrder } from './OrdersClient'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
    const { restaurantId, role } = await getCurrentUser()
    const canRefund = role === 'manager' || role === 'super_admin'

    const adminSupabase = await createAdminClient()

    const { data: orders } = await adminSupabase
        .from('orders')
        .select(`
            id, status, payment_status, total_amount, refunded_amount, placed_at, customer_note,
            sessions ( tables ( label ) ),
            order_items ( id, quantity, menu_items ( name ) )
        `)
        .eq('restaurant_id', restaurantId)
        .order('placed_at', { ascending: false })
        .limit(100) as { data: AdminOrder[] | null }

    return (
        <div className="space-y-4 md:space-y-6">
            <header>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Order History</h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">View and manage all orders. Managers can void or refund orders.</p>
            </header>

            <OrdersClient orders={orders || []} canRefund={canRefund} />
        </div>
    )
}
