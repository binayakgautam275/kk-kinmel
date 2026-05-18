'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CartItem } from '@/types/database'
import { headers } from 'next/headers'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { validateInput, OrderItemSchema } from '@/lib/validation'
import { z } from 'zod'

type PlaceOrderItemPayload = {
    menu_item_id: string
    quantity: number
    special_request: string | null
    modifiers: { modifier_id: string }[]
}

// Serverless-safe rate limiting via Upstash Redis
// Each IP gets 5 requests per 60-second sliding window
// Lazily initialized so missing env vars don't crash the entire module
let _ratelimit: Ratelimit | null = null
function getRatelimit(): Ratelimit | null {
    if (_ratelimit) return _ratelimit
    try {
        _ratelimit = new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(5, '60 s'),
            analytics: true,
            prefix: 'srms:order-ratelimit',
        })
        return _ratelimit
    } catch {
        console.warn('Upstash Redis not configured — rate limiting disabled')
        return null
    }
}

export async function placeOrder(
    sessionId: string,
    restaurantSlug: string,
    items: CartItem[],
    customerNote?: string,
    promoCode?: string | null,
    loyaltyMemberId?: string | null
): Promise<{
    orderId?: string
    subtotal?: number
    discount?: number
    tax?: number
    total?: number
    pointsEarned?: number
    error?: string
}> {
    // Validate all inputs before processing
    const PlaceOrderInputSchema = z.object({
        sessionId: z.string().min(1, 'Session ID required'),
        restaurantSlug: z.string().min(1).max(100),
        items: z.array(OrderItemSchema).min(1, 'At least one item required'),
        customerNote: z.string().max(500).nullable().optional(),
        promoCode: z.string().max(50).nullable().optional(),
        loyaltyMemberId: z.string().uuid().nullable().optional()
    })

    const validation = validateInput(PlaceOrderInputSchema, {
        sessionId,
        restaurantSlug,
        items,
        customerNote,
        promoCode,
        loyaltyMemberId
    })

    if (!validation.success) {
        console.warn('Place order validation failed:', validation.error)
        return { error: `Invalid request: ${validation.error}` }
    }

    // 1. Anti-Spam Rate Limiting via Upstash Redis (serverless-safe)
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') || 'fallback-ip'

    const ratelimit = getRatelimit()
    if (ratelimit) {
        const { success, remaining } = await ratelimit.limit(ip)
        if (!success) {
            console.warn(`Rate limit exceeded for IP: ${ip} (remaining: ${remaining})`)
            return { error: 'You are placing orders too quickly. Please wait a minute and try again.' }
        }
    }

    // 2. Proceed with Order Placement
    const supabase = await createAdminClient()

    // 2a. Resolve session_token → session UUID
    // The client passes session_token (e.g. 's-abc123'), but the RPC expects the UUID primary key
    const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('session_token', sessionId)
        .eq('status', 'active')
        .single()

    if (sessionError || !sessionData) {
        return { error: 'Your table session has expired or is invalid. Please ask your waiter to reopen.' }
    }

    const sessionUuid = sessionData.id

    // Format items payload for the place_order RPC (includes modifiers)
    const payload: PlaceOrderItemPayload[] = items.map((i) => ({
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        special_request: i.specialRequest || null,
        modifiers: (i.modifiers || []).map((m) => ({
            modifier_id: m.modifierId,
        })),
    }))

    // Call the ACID-safe RPC (returns JSONB with breakdown)
    const { data, error } = await supabase.rpc('place_order', {
        p_session_id: sessionUuid,
        p_items: payload,
        p_customer_note: customerNote || null,
        p_promo_code: promoCode || null,
        p_loyalty_member_id: loyaltyMemberId || null,
    })

    if (error) {
        console.error('RPC Error:', error)

        // Map Postgres exception codes to user-friendly messages
        if (error.message.includes('OUT_OF_STOCK') || error.message.includes('ITEM_UNAVAILABLE')) {
            return { error: 'Sorry, one or more items just sold out or are unavailable!' }
        }
        if (error.message.includes('INVALID_SESSION')) {
            return { error: 'Your table session has expired. Ask your waiter to reopen.' }
        }
        if (error.message.includes('INVALID_PROMO')) {
            return { error: 'The promo code is invalid or has expired.' }
        }

        // Hosted DB hotfix fallback:
        // If the RPC itself is broken on this environment (e.g. missing columns,
        // unassigned record), create order rows directly so core flow still works.
        const fallback = await placeOrderFallback(
            supabase,
            sessionUuid,
            payload,
            customerNote || null,
            loyaltyMemberId || null
        )

        if (fallback) {
            revalidatePath(`/t/${restaurantSlug}`)
            return fallback
        }

        return { error: 'Order failed to place. Please try again or ask a waiter.' }
    }

    // Apply dynamic pricing rules then deduct ingredient stock (best-effort — don't fail the order)
    const orderId = (data as { order_id?: string })?.order_id
    if (orderId) {
        await Promise.allSettled([
            supabase.rpc('apply_pricing_rules_to_order', { p_order_id: orderId }),
            supabase.rpc('deduct_ingredients_for_order',  { p_order_id: orderId }),
        ])
    }

    // Purge the cart/menu page caches for this session
    revalidatePath(`/t/${restaurantSlug}`)

    // data is now JSONB: { order_id, subtotal, discount, tax, total, points_earned }
    const result = data as {
        order_id: string
        subtotal: number
        discount: number
        tax: number
        total: number
        points_earned: number
    }

    return {
        orderId: result.order_id,
        subtotal: result.subtotal,
        discount: result.discount,
        tax: result.tax,
        total: result.total,
        pointsEarned: result.points_earned,
    }
}

async function placeOrderFallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    sessionUuid: string,
    payload: PlaceOrderItemPayload[],
    customerNote: string | null,
    loyaltyMemberId: string | null
): Promise<{
    orderId: string
    subtotal: number
    discount: number
    tax: number
    total: number
    pointsEarned: number
} | null> {
    // Get session + restaurant context
    const { data: sessionRow, error: sessionCtxError } = await supabase
        .from('sessions')
        .select('restaurant_id')
        .eq('id', sessionUuid)
        .single()

    if (sessionCtxError || !sessionRow?.restaurant_id) return null

    const restaurantId = sessionRow.restaurant_id as string

    // Create pending order first
    const { data: orderRow, error: orderInsertError } = await supabase
        .from('orders')
        .insert({
            session_id: sessionUuid,
            restaurant_id: restaurantId,
            customer_note: customerNote,
            loyalty_member_id: loyaltyMemberId,
            status: 'pending',
            payment_status: 'unpaid',
        })
        .select('id')
        .single()

    if (orderInsertError || !orderRow?.id) {
        console.error('Fallback order insert failed:', orderInsertError)
        return null
    }

    const orderId = orderRow.id as string
    let subtotal = 0

    // Insert each line item (+ optional modifiers)
    for (const item of payload) {
        const { data: menuItem } = await supabase
            .from('menu_items')
            .select('id, price')
            .eq('id', item.menu_item_id)
            .single()

        if (!menuItem?.id) continue

        const unitPrice = Number(menuItem.price ?? 0)

        const { data: orderItemRow, error: orderItemInsertError } = await supabase
            .from('order_items')
            .insert({
                order_id: orderId,
                menu_item_id: menuItem.id,
                quantity: item.quantity,
                unit_price: unitPrice,
                special_request: item.special_request,
            })
            .select('id')
            .single()

        if (orderItemInsertError || !orderItemRow?.id) {
            console.error('Fallback order item insert failed:', orderItemInsertError)
            continue
        }

        let itemTotal = unitPrice * item.quantity

        if (item.modifiers?.length) {
            for (const mod of item.modifiers) {
                const { data: modRow } = await supabase
                    .from('menu_item_modifiers')
                    .select('id, name, price_adjustment')
                    .eq('id', mod.modifier_id)
                    .single()

                if (!modRow?.id) continue

                await supabase.from('order_item_modifiers').insert({
                    order_item_id: orderItemRow.id,
                    modifier_id: modRow.id,
                    modifier_name: modRow.name,
                    price_adjustment: modRow.price_adjustment,
                })

                itemTotal += Number(modRow.price_adjustment ?? 0) * item.quantity
            }
        }

        subtotal += itemTotal
    }

    const discount = 0
    const tax = 0
    const total = subtotal - discount + tax

    const { error: totalsUpdateError } = await supabase
        .from('orders')
        .update({
            subtotal_amount: subtotal,
            discount_amount: discount,
            tax_amount: tax,
            total_amount: total,
        })
        .eq('id', orderId)

    if (totalsUpdateError) {
        console.error('Fallback order totals update failed:', totalsUpdateError)
    }

    // Apply pricing rules + deduct ingredients (best-effort)
    await Promise.allSettled([
        supabase.rpc('apply_pricing_rules_to_order', { p_order_id: orderId }),
        supabase.rpc('deduct_ingredients_for_order',  { p_order_id: orderId }),
    ])

    return {
        orderId,
        subtotal,
        discount,
        tax,
        total,
        pointsEarned: 0,
    }
}
