import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import CashierClient from '@/components/waiter/CashierClient'

export const revalidate = 0

export default async function CashierPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const [
        { data: unpaidOrders },
        { data: activeOrders },
        { data: tables },
    ] = await Promise.all([
        // Delivered but not yet paid — ready for cashier
        adminSupabase
            .from('orders')
            .select(`
                id, total_amount, delivered_at, payment_status, payment_method, session_id,
                sessions ( id, tables ( id, label ) ),
                order_items ( quantity, menu_items ( name ) )
            `)
            .eq('restaurant_id', restaurantId)
            .eq('status', 'delivered')
            .eq('payment_status', 'unpaid')
            .order('delivered_at', { ascending: true })
            .limit(50),

        // Currently being prepared / pending — so cashier can see incoming
        adminSupabase
            .from('orders')
            .select(`
                id, status, total_amount, placed_at, session_id,
                sessions ( id, tables ( label ) )
            `)
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
            .order('placed_at', { ascending: true }),

        // All active tables
        adminSupabase
            .from('tables')
            .select('id, label, capacity')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('label', { ascending: true }),
    ])

    return (
        <CashierClient
            restaurantId={restaurantId}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialUnpaid={(unpaidOrders || []) as any[]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialActive={(activeOrders || []) as any[]}
            tables={(tables || []).map(t => ({ id: t.id, label: t.label, capacity: t.capacity }))}
        />
    )
}
