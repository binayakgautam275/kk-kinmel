import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import OrderQueue, { type KitchenOrder } from '@/components/kitchen/OrderQueue'
import TakeoutQueue from '@/components/kitchen/TakeoutQueue'
import { getRestaurantFeatures } from '@/lib/features'
import type { TakeoutOrder } from '@/types/database'

export const revalidate = 0 // Never cache the kitchen page securely

export default async function KitchenPage() {
    const { restaurantId } = await getCurrentUser()
    const adminSupabase = await createAdminClient()

    // Fetch feature flags, active orders + takeout orders in parallel
    const [features, { data: activeOrders }, { data: takeoutOrders }] = await Promise.all([
        getRestaurantFeatures(restaurantId),
        adminSupabase
            .from('orders')
            .select(`
      id,
      status,
      total_amount,
      placed_at,
      customer_note,
      sessions ( tables ( label ) ),
      order_items (
        id,
        quantity,
        special_request,
        menu_items ( name ),
        order_item_modifiers ( modifier_name, price_adjustment )
      )
    `)
            .eq('restaurant_id', restaurantId)
            .in('status', ['pending', 'confirmed', 'preparing'])
            .order('placed_at', { ascending: true }),
        adminSupabase
            .from('takeout_orders')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .in('status', ['placed', 'confirmed', 'preparing'])
            .order('pickup_time', { ascending: true }),
    ])

    return (
        <div className="h-full space-y-6 p-4 overflow-y-auto">
            <OrderQueue
                initialOrders={(activeOrders || []) as unknown as KitchenOrder[]}
                restaurantId={restaurantId}
            />
            {/* TakeoutQueue — only shown if takeout is enabled */}
            {features?.takeoutEnabled && (
                <TakeoutQueue
                    initialOrders={(takeoutOrders || []) as unknown as TakeoutOrder[]}
                    restaurantId={restaurantId}
                />
            )}
        </div>
    )
}
