'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@/types/database'

/**
 * Kitchen updates order status: pending → preparing → ready
 * Steps 5-6 of the Golden Path.
 */
// A kitchen screen can hold stale state when several cooks work the same queue.
// Each target status may only be reached from its expected prior status, so the
// DB — not the client's view — decides whether a transition is legal. This stops
// a lagging tab from regressing an order (ready → preparing) or skipping a step.
const ALLOWED_PRIOR: Partial<Record<OrderStatus, OrderStatus[]>> = {
    preparing: ['pending', 'confirmed'],
    ready: ['preparing'],
}

export async function updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus
): Promise<{ success?: boolean; error?: string; conflict?: boolean }> {
    const adminSupabase = await createAdminClient()

    const updateData: { status: OrderStatus; ready_at?: string } = { status: nextStatus }
    if (nextStatus === 'ready') {
        updateData.ready_at = new Date().toISOString()
    }

    let query = adminSupabase.from('orders').update(updateData).eq('id', orderId)
    const priorStates = ALLOWED_PRIOR[nextStatus]
    if (priorStates) query = query.in('status', priorStates)

    const { data, error } = await query.select('id')

    if (error) {
        console.error('Failed to update order status:', error)
        return { error: error.message }
    }
    if (priorStates && (!data || data.length === 0)) {
        // Another cook already advanced this order; tell the caller to resync.
        return { conflict: true, error: 'Order was already updated by someone else' }
    }

    revalidatePath('/kitchen')
    return { success: true }
}
