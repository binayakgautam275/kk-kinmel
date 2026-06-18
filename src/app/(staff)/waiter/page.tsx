import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import TableManager, { type TableWithSession } from '@/components/waiter/TableManager'
import ServiceRequestFeed from '@/components/waiter/ServiceRequestFeed'
import StaffShiftClock from '@/components/shared/StaffShiftClock'
import PaymentVerificationFeed from '@/components/waiter/PaymentVerificationFeed'
import WaiterOrderFeed from '@/components/waiter/WaiterOrderFeed'
import WaiterTakeoutFeed from '@/components/waiter/WaiterTakeoutFeed'
import FloorStats from '@/components/waiter/FloorStats'
import CashPaymentFeed from '@/components/waiter/CashPaymentFeed'
import ActiveSessionsList from '@/components/waiter/ActiveSessionsList'
import { getRestaurantFeatures } from '@/lib/features'
import { Users, Package, Bell, ChefHat } from 'lucide-react'

export const revalidate = 0

export default async function WaiterPage() {
    const { id: userId, restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    const now = new Date().toISOString()

    // Fetch tables and active sessions separately — more reliable than a nested join
    const [{ data: tables }, { data: activeSessions }] = await Promise.all([
        adminSupabase
            .from('tables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('label', { ascending: true }),
        adminSupabase
            .from('sessions')
            .select('id, table_id, restaurant_id, opened_by, session_token, status, opened_at, closed_at, expires_at, guest_count, max_seats, notes')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'active')
            .gt('expires_at', now),
    ])

    const activeSessionByTable = Object.fromEntries(
        (activeSessions || []).map(s => [s.table_id, s])
    )

    const mappedTables = (tables || []).map(table => ({
        ...table,
        activeSession: activeSessionByTable[table.id] || null,
    }))

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const [
        features,
        { data: serviceRequests },
        { data: activeShift },
        { data: shiftHistory },
        { data: paymentClaims },
        { data: activeOrders },
        { data: readyTakeouts },
        { data: unpaidDelivered },
    ] = await Promise.all([
        getRestaurantFeatures(restaurantId),
        adminSupabase
            .from('service_requests')
            .select('*, sessions(tables(label)), direct_table:tables(label)')
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'acknowledged'])
            .order('created_at', { ascending: false })
            .limit(20),
        adminSupabase
            .from('staff_shifts')
            .select('*')
            .eq('user_id', userId)
            .is('clock_out', null)
            .order('clock_in', { ascending: false })
            .limit(1)
            .maybeSingle(),
        adminSupabase
            .from('staff_shifts')
            .select('*')
            .eq('user_id', userId)
            .not('clock_out', 'is', null)
            .order('clock_in', { ascending: false })
            .limit(5),
        adminSupabase
            .from('payment_verifications')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false })
            .limit(20),
        adminSupabase
            .from('orders')
            .select(`
                id, status, total_amount, placed_at, ready_at, customer_note, payment_status, session_id,
                sessions ( id, tables ( label ) ),
                order_items ( id, quantity, menu_items ( name ) )
            `)
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
            .order('placed_at', { ascending: true }),
        adminSupabase
            .from('takeout_orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'ready_for_pickup')
            .order('pickup_time', { ascending: true })
            .limit(20),
        adminSupabase
            .from('orders')
            .select(`
                id, total_amount, delivered_at, session_id,
                sessions ( id, tables ( label ) )
            `)
            .eq('restaurant_id', restaurantId)
            .eq('status', 'delivered')
            .eq('payment_status', 'unpaid')
            .order('delivered_at', { ascending: true })
            .limit(30),
    ])

    // Floor stats for the top bar
    const occupiedTables = mappedTables.filter(t => t.activeSession).length
    const totalTables = mappedTables.length
    const readyOrders = (activeOrders || []).filter(o => o.status === 'ready').length
    const kitchenOrders = (activeOrders || []).filter(o => o.status === 'preparing' || o.status === 'confirmed' || o.status === 'pending').length
    const pendingRequests = (serviceRequests || []).filter(r => r.status === 'pending').length

    // Active sessions list data
    const tablesMap: Record<string, string> = Object.fromEntries(mappedTables.map(t => [t.id, t.label]))
    const activeSessionEntries = mappedTables
        .filter(t => t.activeSession)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(t => {
            const session = t.activeSession as any
            const sessionOrders = (activeOrders || []).filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (o: any) => o.session_id === session.id && !['delivered', 'cancelled'].includes(o.status)
            )
            return {
                tableId: t.id,
                tableLabel: t.label,
                sessionId: session.id as string,
                openedAt: (session.opened_at ?? session.created_at ?? now) as string,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                orderCount: sessionOrders.length,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                totalAmount: sessionOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0),
            }
        })
        .sort((a, b) => a.tableLabel.localeCompare(b.tableLabel, undefined, { numeric: true }))

    return (
        <div className="space-y-4 md:space-y-5">

            {/* Floor Stats — always-visible at-a-glance bar */}
            <FloorStats
                occupiedTables={occupiedTables}
                totalTables={totalTables}
                readyOrders={readyOrders}
                kitchenOrders={kitchenOrders}
                pendingRequests={pendingRequests}
                restaurantId={restaurantId}
            />

            {/* Active sessions list — quick overview of occupied tables */}
            <ActiveSessionsList
                initialEntries={activeSessionEntries}
                tablesMap={tablesMap}
                restaurantId={restaurantId}
            />

            {/* 1. Service Requests — most urgent, someone needs help NOW */}
            {features?.serviceRequestsEnabled !== false && (
                <ServiceRequestFeed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialRequests={(serviceRequests || []) as any[]}
                    restaurantId={restaurantId}
                    userId={userId}
                />
            )}

            {/* 2. Active Order Feed — ready orders need immediate delivery */}
            <WaiterOrderFeed
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                initialOrders={(activeOrders || []) as any[]}
                restaurantId={restaurantId}
            />

            {/* 3. Cash Payment Quick-Actions — delivered orders awaiting cash collection */}
            {unpaidDelivered && unpaidDelivered.length > 0 && (
                <CashPaymentFeed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialOrders={unpaidDelivered as any[]}
                    restaurantId={restaurantId}
                />
            )}

            {/* 4. Nepal Payment Verification */}
            {features?.nepalPayEnabled && (
                <PaymentVerificationFeed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialClaims={(paymentClaims || []) as any[]}
                    restaurantId={restaurantId}
                    userId={userId}
                />
            )}

            {/* 5. Takeout Pickup Feed */}
            {features?.takeoutEnabled && (
                <WaiterTakeoutFeed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialOrders={(readyTakeouts || []) as any[]}
                    restaurantId={restaurantId}
                />
            )}

            {/* 6. Table Manager — manage floor, open/close sessions */}
            <TableManager
                initialTables={mappedTables as unknown as TableWithSession[]}
                restaurantId={restaurantId}
                appUrl={appUrl}
                initialOrders={(activeOrders || []).map(o => ({ id: o.id, session_id: o.session_id, status: o.status }))}
            />

            {/* 7. Shift Clock — used at start/end of shift only */}
            {features?.staffShiftsEnabled && (
                <StaffShiftClock
                    userId={userId}
                    restaurantId={restaurantId}
                    initialShift={activeShift || null}
                    initialHistory={shiftHistory || []}
                />
            )}

        </div>
    )
}
