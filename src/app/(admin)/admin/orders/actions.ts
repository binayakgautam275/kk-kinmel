'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function refundOrderAction(
    orderId: string,
    reason: string
): Promise<{ error?: string; success?: boolean }> {
    const currentUser = await requireRole('manager', 'super_admin')

    if (!reason.trim()) return { error: 'A reason is required for refunds.' }

    const supabase = await createAdminClient()

    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, restaurant_id, total_amount, payment_status, status')
        .eq('id', orderId)
        .single()

    if (fetchError || !order) return { error: 'Order not found.' }
    if (order.payment_status === 'refunded') return { error: 'Order has already been refunded.' }
    if (!['paid', 'unpaid'].includes(order.payment_status)) {
        return { error: `Cannot refund an order with status: ${order.payment_status}` }
    }

    const { error: updateError } = await supabase
        .from('orders')
        .update({
            payment_status: 'refunded',
            customer_note: order.payment_status === 'paid'
                ? `[REFUNDED] ${reason}`
                : `[VOIDED] ${reason}`,
        })
        .eq('id', orderId)

    if (updateError) return { error: updateError.message }

    void logAudit({
        restaurantId: order.restaurant_id,
        userId: currentUser.id,
        action: 'order_cancelled',
        entityType: 'order',
        entityId: orderId,
        oldValue: { payment_status: order.payment_status, total_amount: order.total_amount },
        newValue: { payment_status: 'refunded', reason },
    })

    revalidatePath('/admin/orders')
    return { success: true }
}
