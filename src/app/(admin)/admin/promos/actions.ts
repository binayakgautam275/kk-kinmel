'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// These actions use the RLS-bypassing admin client, so the auth check + the
// restaurant_id scoping below are the only things isolating one tenant's promo
// codes from another's. Every action must verify the caller and scope writes.

async function requirePromoManager() {
    return requireRole('super_admin', 'manager')
}

// Fields a manager is allowed to set/change. Excludes id, restaurant_id,
// current_uses and created_at so a tampered payload can't reassign ownership
// or rewrite usage counters.
const EDITABLE_FIELDS = [
    'code', 'description', 'promo_type', 'value',
    'min_order_amount', 'max_discount_amount', 'max_uses', 'valid_until', 'is_active',
] as const

function sanitizeUpdates(updates: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {}
    for (const key of EDITABLE_FIELDS) {
        if (key in updates) clean[key] = updates[key]
    }
    if (typeof clean.code === 'string') clean.code = clean.code.toUpperCase().trim()
    return clean
}

export async function getPromoCodesAction() {
    let user
    try {
        user = await requirePromoManager()
    } catch {
        return { error: 'You are not authorized to manage promo codes.' }
    }
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('restaurant_id', user.restaurantId)
        .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { data }
}

export async function createPromoCodeAction(input: {
    restaurant_id?: string
    code: string
    promo_type: string
    value: number
    min_order_amount?: number
    max_discount_amount?: number
    max_uses?: number
    valid_until?: string
    is_active?: boolean
}) {
    let user
    try {
        user = await requirePromoManager()
    } catch {
        return { error: 'You are not authorized to manage promo codes.' }
    }

    const code = input.code?.toUpperCase().trim()
    if (!code) return { error: 'Promo code is required.' }
    if (!Number.isFinite(input.value) || input.value < 0) {
        return { error: 'Value must be a positive number.' }
    }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('promo_codes')
        .insert({
            code,
            promo_type: input.promo_type,
            value: input.value,
            min_order_amount: input.min_order_amount,
            max_discount_amount: input.max_discount_amount,
            max_uses: input.max_uses,
            valid_until: input.valid_until,
            is_active: input.is_active ?? true,
            // Always the authenticated user's restaurant — never trust the client.
            restaurant_id: user.restaurantId,
        })
        .select()
        .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/promos')
    return { data }
}

export async function updatePromoCodeAction(id: string, updates: Record<string, unknown>) {
    let user
    try {
        user = await requirePromoManager()
    } catch {
        return { error: 'You are not authorized to manage promo codes.' }
    }

    const clean = sanitizeUpdates(updates)
    if (Object.keys(clean).length === 0) return { error: 'Nothing to update.' }
    if ('code' in clean && !clean.code) return { error: 'Promo code is required.' }
    if ('value' in clean && (!Number.isFinite(clean.value as number) || (clean.value as number) < 0)) {
        return { error: 'Value must be a positive number.' }
    }

    const supabase = await createAdminClient()
    const { error, count } = await supabase
        .from('promo_codes')
        .update(clean, { count: 'exact' })
        .eq('id', id)
        .eq('restaurant_id', user.restaurantId)
    if (error) return { error: error.message }
    if (!count) return { error: 'Promo code not found.' }
    revalidatePath('/admin/promos')
    return { success: true }
}

export async function deletePromoCodeAction(id: string) {
    let user
    try {
        user = await requirePromoManager()
    } catch {
        return { error: 'You are not authorized to manage promo codes.' }
    }
    const supabase = await createAdminClient()
    const { error, count } = await supabase
        .from('promo_codes')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('restaurant_id', user.restaurantId)
    if (error) return { error: error.message }
    if (!count) return { error: 'Promo code not found.' }
    revalidatePath('/admin/promos')
    return { success: true }
}
