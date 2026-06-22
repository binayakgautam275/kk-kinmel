'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OrderStatus } from '@/types/database'

/**
 * Kitchen updates order status: pending → preparing → ready
 * Steps 5-6 of the Golden Path.
 */
export async function updateOrderStatus(orderId: string, nextStatus: OrderStatus) {
    const adminSupabase = await createAdminClient()

    const updateData: { status: OrderStatus; ready_at?: string } = { status: nextStatus }
    if (nextStatus === 'ready') {
        updateData.ready_at = new Date().toISOString()
    }

    const { error } = await adminSupabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)

    if (error) {
        console.error('Failed to update order status:', error)
        return { error: error.message }
    }

    revalidatePath('/kitchen')
    return { success: true }
}
