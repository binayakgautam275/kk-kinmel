'use server'

import { createAdminClient } from '@/lib/supabase/server'

export async function submitFeedback(
    orderId: string,
    rating: number,
    comment: string
): Promise<{ success?: boolean; error?: string }> {
    if (rating < 1 || rating > 5) return { error: 'Rating must be between 1 and 5.' }

    const supabase = await createAdminClient()

    // Get restaurant_id from the order
    const { data: order } = await supabase
        .from('orders')
        .select('restaurant_id')
        .eq('id', orderId)
        .single()

    if (!order?.restaurant_id) return { error: 'Order not found.' }

    const { error } = await supabase.from('feedback').insert({
        order_id: orderId,
        restaurant_id: order.restaurant_id,
        rating,
        comment: comment.trim() || null,
    })

    if (error) return { error: error.message }
    return { success: true }
}
