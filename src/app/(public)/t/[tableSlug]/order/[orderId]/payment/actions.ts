'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function applyPromoToOrder(
    orderId: string,
    restaurantId: string,
    promoCodeStr: string
): Promise<{ success?: boolean; error?: string; discount?: number; total?: number }> {
    const supabase = await createAdminClient()

    // 1. Fetch order
    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

    if (orderErr || !order) {
        return { error: 'Order not found.' }
    }

    if (order.payment_status === 'paid') {
        return { error: 'Order is already paid.' }
    }

    // 2. Fetch promo code
    const { data: promo, error: promoErr } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('code', promoCodeStr.toUpperCase())
        .eq('is_active', true)
        .single()

    if (promoErr || !promo) {
        return { error: 'Invalid or inactive promo code.' }
    }

    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        return { error: 'This promo code has expired.' }
    }

    if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        return { error: 'This promo code has reached its maximum uses.' }
    }

    const subtotal = Number(order.subtotal_amount || 0)
    if (subtotal < (promo.min_order_amount || 0)) {
        return { error: `Minimum order amount of Rs. ${promo.min_order_amount} required.` }
    }

    // 3. Calculate discount
    let promoDiscount = 0
    if (promo.promo_type === 'percentage_off') {
        promoDiscount = Math.min(subtotal * (promo.value / 100), promo.max_discount_amount || Infinity)
    } else if (promo.promo_type === 'amount_off') {
        promoDiscount = Math.min(promo.value, subtotal)
    } else {
        return { error: 'This type of promo code cannot be applied post-order.' }
    }

    return { success: true }
}

export async function updateOrderPaymentDetails(
    orderId: string,
    payload: {
        promoCodeId?: string | null
        promoDiscount?: number
        loyaltyMemberId?: string | null
        loyaltyDiscount?: number
    }
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createAdminClient()

    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('subtotal_amount, tax_amount')
        .eq('id', orderId)
        .single()

    if (orderErr || !order) {
        return { success: false, error: 'Order not found.' }
    }

    const subtotal = Number(order.subtotal_amount || 0)
    const tax = Number(order.tax_amount || 0)
    const promoDiscount = payload.promoDiscount || 0
    const loyaltyDiscount = payload.loyaltyDiscount || 0
    const totalDiscount = promoDiscount + loyaltyDiscount
    const newTotal = Math.max(0, subtotal - totalDiscount + tax)

    const { error: updateErr } = await supabase
        .from('orders')
        .update({
            promo_code_id: payload.promoCodeId !== undefined ? payload.promoCodeId : undefined,
            loyalty_member_id: payload.loyaltyMemberId !== undefined ? payload.loyaltyMemberId : undefined,
            discount_amount: totalDiscount,
            total_amount: newTotal,
        })
        .eq('id', orderId)

    if (updateErr) {
        return { success: false, error: updateErr.message }
    }

    // If there was a promo code applied, increment its use counter
    if (payload.promoCodeId) {
        const { data: promo } = await supabase
            .from('promo_codes')
            .select('current_uses')
            .eq('id', payload.promoCodeId)
            .single()
        if (promo) {
            await supabase
                .from('promo_codes')
                .update({ current_uses: (promo.current_uses || 0) + 1 })
                .eq('id', payload.promoCodeId)
        }
    }

    revalidatePath(`/t/[tableSlug]/order/[orderId]/payment`)
    return { success: true }
}
