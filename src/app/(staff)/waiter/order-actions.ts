'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { requireRole } from '@/lib/auth'

/**
 * Waiter marks an order as delivered.
 * Step 7 of the Golden Path: Waiter picks up ready food & delivers.
 */
export async function markOrderDelivered(orderId: string) {
    const currentUser = await requireRole('waiter', 'manager', 'super_admin')
    const adminSupabase = await createAdminClient()

    const { data: order, error } = await adminSupabase
        .from('orders')
        .update({
            status: 'delivered',
            delivered_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select('restaurant_id')
        .single()

    if (error) {
        console.error('Failed to mark order delivered:', error)
        return { error: error.message }
    }

    void logAudit({
        restaurantId: order.restaurant_id,
        userId: currentUser.id,
        action: 'order_delivered',
        entityType: 'order',
        entityId: orderId,
        newValue: { status: 'delivered' },
    })

    revalidatePath('/waiter')
    return { success: true }
}

/**
 * Waiter records cash payment for a delivered order.
 * Creates a verified payment_verification record (cash method) and marks the
 * order paid. Closes the session automatically if all orders are now settled.
 */
export async function markCashPaid(
    orderId: string
): Promise<{ error?: string; success?: boolean; tableClosed?: boolean }> {
    const currentUser = await requireRole('waiter', 'manager', 'super_admin')
    const supabase = await createAdminClient()

    // 1. Fetch order details
    const { data: order, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, restaurant_id, session_id, total_amount, payment_status')
        .eq('id', orderId)
        .single()

    if (orderFetchError || !order) return { error: 'Order not found' }
    if (order.payment_status === 'paid') return { error: 'Order is already marked as paid' }

    // 2. Mark the order as paid
    const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', orderId)

    if (updateError) return { error: updateError.message }

    // 3. Insert a verified cash payment_verification record
    await supabase.from('payment_verifications').insert({
        restaurant_id: order.restaurant_id,
        order_id: orderId,
        amount: order.total_amount,
        payment_method: 'cash',
        staff_verified: true,
        staff_rejected: false,
        staff_verified_by: currentUser.id,
        staff_verified_at: new Date().toISOString(),
    })

    void logAudit({
        restaurantId: order.restaurant_id,
        userId: currentUser.id,
        action: 'payment_verified',
        entityType: 'payment',
        entityId: orderId,
        newValue: { payment_method: 'cash', amount: order.total_amount },
    })

    // 4. Close session if all orders in session are now paid
    let tableClosed = false
    if (order.session_id) {
        const { count: unpaidCount } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', order.session_id)
            .neq('payment_status', 'paid')
            .neq('status', 'cancelled')

        if (unpaidCount === 0) {
            await supabase
                .from('sessions')
                .update({ status: 'closed', closed_at: new Date().toISOString() })
                .eq('id', order.session_id)
                .eq('status', 'active')

            void logAudit({
                restaurantId: order.restaurant_id,
                userId: currentUser.id,
                action: 'session_closed',
                entityType: 'session',
                entityId: order.session_id,
                newValue: { reason: 'all_orders_paid' },
            })

            tableClosed = true
        }
    }

    revalidatePath('/waiter')
    return { success: true, tableClosed }
}

/**
 * Combined action: Verify payment claim → Mark orders paid → Close session.
 * Step 9 of the Golden Path: "Verify Payment & Close Table"
 *
 * Flow:
 * 1. Verify the payment claim (status → 'verified')
 * 2. Mark the associated order as paid
 * 3. Check if ALL orders in the session are now paid
 * 4. If all paid, close the session → table turns green (available)
 */
export async function verifyPaymentAndCloseTable(
    claimId: string,
    userId: string
): Promise<{ error?: string; success?: boolean; tableClosed?: boolean }> {
    const supabase = await createAdminClient()

    // 1. Verify the payment claim and get order_id + restaurant_id
    const { data: claim, error: claimError } = await supabase
        .from('payment_verifications')
        .update({
            status: 'verified',
            verified_by: userId,
            verified_at: new Date().toISOString(),
        })
        .eq('id', claimId)
        .select('order_id, restaurant_id')
        .single()

    if (claimError || !claim) {
        console.error('Payment verification update failed:', claimError)
        return { error: 'Failed to verify payment' }
    }

    if (!claim.order_id) {
        void logAudit({
            restaurantId: claim.restaurant_id,
            userId,
            action: 'payment_verified',
            entityType: 'payment',
            entityId: claimId,
        })
        revalidatePath('/waiter')
        return { success: true, tableClosed: false }
    }

    // 2. Mark the associated order as paid
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
        })
        .eq('id', claim.order_id)
        .select('session_id, restaurant_id')
        .single()

    if (orderError || !order) {
        console.error('Failed to update order payment:', orderError)
        revalidatePath('/waiter')
        return { success: true, tableClosed: false }
    }

    void logAudit({
        restaurantId: order.restaurant_id,
        userId,
        action: 'payment_verified',
        entityType: 'payment',
        entityId: claimId,
        newValue: { order_id: claim.order_id, payment_status: 'paid' },
    })

    // 3. Check if ALL orders in this session are paid
    const { count: unpaidCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', order.session_id)
        .neq('payment_status', 'paid')
        .neq('status', 'cancelled')

    if (unpaidCount === 0) {
        // 4. All orders paid — close the session
        const { error: sessionError } = await supabase
            .from('sessions')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString(),
            })
            .eq('id', order.session_id)
            .eq('status', 'active')

        if (sessionError) {
            console.error('Failed to close session:', sessionError)
        }

        void logAudit({
            restaurantId: order.restaurant_id,
            userId,
            action: 'session_closed',
            entityType: 'session',
            entityId: order.session_id,
            newValue: { reason: 'all_orders_paid' },
        })

        revalidatePath('/waiter')
        return { success: true, tableClosed: true }
    }

    revalidatePath('/waiter')
    return { success: true, tableClosed: false }
}
