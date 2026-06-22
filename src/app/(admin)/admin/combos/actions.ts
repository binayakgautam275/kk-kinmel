'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

interface ComboData {
    name: string
    description: string | null
    price: number
    category_id: string | null
    image_url: string | null
    is_available: boolean
}

interface ComboItemInput {
    item_id: string
    quantity: number
}

// Uniform result shape so callers can always read `.error` regardless of branch.
type ComboActionResult = { error?: string; success?: boolean; data?: unknown }

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>

/**
 * Validate combo fields and normalize/verify its component items.
 *
 * These actions use the RLS-bypassing admin client, so every check here is the
 * only thing standing between a caller and another tenant's data:
 *  - quantities are coerced to positive integers and duplicate items merged
 *    (the DB has a UNIQUE (combo_id, item_id) constraint),
 *  - every component must be a NON-combo item belonging to `restaurantId`
 *    (blocks cross-tenant items and nesting a combo inside a combo).
 */
async function validateComboInput(
    supabase: AdminClient,
    restaurantId: string,
    comboData: ComboData,
    items: ComboItemInput[],
): Promise<{ error: string } | { items: ComboItemInput[] }> {
    if (!comboData.name?.trim()) return { error: 'Combo name is required.' }
    if (!Number.isFinite(comboData.price) || comboData.price < 0) {
        return { error: 'Price must be a positive number.' }
    }
    if (!items.length) return { error: 'A combo must include at least one item.' }

    const merged = new Map<string, number>()
    for (const it of items) {
        const qty = Math.floor(Number(it.quantity))
        if (!it.item_id || !Number.isFinite(qty) || qty < 1) {
            return { error: 'Each bundle item needs a valid quantity of at least 1.' }
        }
        merged.set(it.item_id, (merged.get(it.item_id) ?? 0) + qty)
    }
    const cleaned = Array.from(merged, ([item_id, quantity]) => ({ item_id, quantity }))

    const ids = cleaned.map(c => c.item_id)
    const { data: valid } = await supabase
        .from('menu_items')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('is_combo', false)
        .in('id', ids)

    const validIds = new Set((valid ?? []).map(r => r.id))
    if (validIds.size !== ids.length) {
        return { error: 'One or more bundle items are invalid or not part of this restaurant.' }
    }

    return { items: cleaned }
}

export async function addComboAction(
    _restaurantId: string,
    comboData: ComboData,
    items: ComboItemInput[],
): Promise<ComboActionResult> {
    let user
    try {
        user = await requireRole('super_admin', 'manager')
    } catch {
        return { error: 'You are not authorized to manage combos.' }
    }

    try {
        const supabase = await createAdminClient()
        // Scope to the authenticated user's restaurant — never trust the client-supplied id.
        const restaurantId = user.restaurantId

        const validated = await validateComboInput(supabase, restaurantId, comboData, items)
        if ('error' in validated) return validated

        const { data: menuCombo, error: comboErr } = await supabase
            .from('menu_items')
            .insert({
                restaurant_id: restaurantId,
                name: comboData.name.trim(),
                description: comboData.description,
                price: comboData.price,
                category_id: comboData.category_id || null,
                image_url: comboData.image_url || null,
                is_available: comboData.is_available,
                is_combo: true,
            })
            .select()
            .single()

        if (comboErr || !menuCombo) {
            return { error: comboErr?.message ?? 'Failed to create combo.' }
        }

        const { error: itemsErr } = await supabase.from('combo_items').insert(
            validated.items.map(it => ({ combo_id: menuCombo.id, item_id: it.item_id, quantity: it.quantity })),
        )

        if (itemsErr) {
            // Roll back the orphaned combo so we don't leave an empty bundle.
            await supabase.from('menu_items').delete().eq('id', menuCombo.id)
            return { error: itemsErr.message }
        }

        revalidatePath('/admin/combos')
        revalidatePath('/admin/menu')
        return { data: menuCombo }
    } catch (err) {
        console.error('Error in addComboAction:', err)
        return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
    }
}

export async function updateComboAction(
    comboId: string,
    comboData: ComboData,
    items: ComboItemInput[],
): Promise<ComboActionResult> {
    let user
    try {
        user = await requireRole('super_admin', 'manager')
    } catch {
        return { error: 'You are not authorized to manage combos.' }
    }

    try {
        const supabase = await createAdminClient()
        const restaurantId = user.restaurantId

        // Ownership: the combo must belong to this restaurant (and actually be a combo).
        const { data: existing } = await supabase
            .from('menu_items')
            .select('id')
            .eq('id', comboId)
            .eq('restaurant_id', restaurantId)
            .eq('is_combo', true)
            .maybeSingle()
        if (!existing) return { error: 'Combo not found.' }

        const validated = await validateComboInput(supabase, restaurantId, comboData, items)
        if ('error' in validated) return validated

        const { error: comboErr } = await supabase
            .from('menu_items')
            .update({
                name: comboData.name.trim(),
                description: comboData.description,
                price: comboData.price,
                category_id: comboData.category_id || null,
                image_url: comboData.image_url || null,
                is_available: comboData.is_available,
            })
            .eq('id', comboId)
            .eq('restaurant_id', restaurantId)

        if (comboErr) return { error: comboErr.message }

        // Replace components atomically (delete + insert in one transaction) so the
        // combo is never momentarily left without items.
        const { error: rpcErr } = await supabase.rpc('replace_combo_items', {
            p_combo_id: comboId,
            p_items: validated.items,
        })
        if (rpcErr) return { error: rpcErr.message }

        revalidatePath('/admin/combos')
        revalidatePath('/admin/menu')
        return { success: true }
    } catch (err) {
        console.error('Error in updateComboAction:', err)
        return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
    }
}

export async function deleteComboAction(comboId: string): Promise<ComboActionResult> {
    let user
    try {
        user = await requireRole('super_admin', 'manager')
    } catch {
        return { error: 'You are not authorized to manage combos.' }
    }

    try {
        const supabase = await createAdminClient()

        // 1. Check if the combo has been ordered
        const { count: orderCount, error: countErr } = await supabase
            .from('order_items')
            .select('id', { count: 'exact', head: true })
            .eq('menu_item_id', comboId)

        if (countErr) return { error: countErr.message }

        const isOrdered = (orderCount ?? 0) > 0

        if (isOrdered) {
            // Soft delete since it has historical orders
            const { error: updateErr } = await supabase
                .from('menu_items')
                .update({ is_deleted: true, is_available: false, category_id: null })
                .eq('id', comboId)
                .eq('restaurant_id', user.restaurantId)

            if (updateErr) {
                if (updateErr.message.includes('is_deleted') || updateErr.code === 'PGRST205' || updateErr.code === '42703') {
                    const { error: fallbackErr } = await supabase
                        .from('menu_items')
                        .update({ is_available: false, category_id: null })
                        .eq('id', comboId)
                        .eq('restaurant_id', user.restaurantId)
                    if (fallbackErr) return { error: fallbackErr.message }
                } else {
                    return { error: updateErr.message }
                }
            }
        } else {
            // Try hard deleting
            const { error, count } = await supabase
                .from('menu_items')
                .delete({ count: 'exact' })
                .eq('id', comboId)
                .eq('restaurant_id', user.restaurantId)
                .eq('is_combo', true)

            if (error) {
                // If hard delete fails, fallback to soft delete
                const { error: updateErr } = await supabase
                    .from('menu_items')
                    .update({ is_deleted: true, is_available: false, category_id: null })
                    .eq('id', comboId)
                    .eq('restaurant_id', user.restaurantId)

                if (updateErr) {
                    if (updateErr.message.includes('is_deleted') || updateErr.code === 'PGRST205' || updateErr.code === '42703') {
                        const { error: fallbackErr } = await supabase
                            .from('menu_items')
                            .update({ is_available: false, category_id: null })
                            .eq('id', comboId)
                            .eq('restaurant_id', user.restaurantId)
                        if (fallbackErr) return { error: fallbackErr.message }
                    } else {
                        return { error: updateErr.message }
                    }
                }
            } else if (!count) {
                return { error: 'Combo not found.' }
            }
        }

        revalidatePath('/admin/combos')
        revalidatePath('/admin/menu')
        return { success: true }
    } catch (err) {
        console.error('Error in deleteComboAction:', err)
        return { error: err instanceof Error ? err.message : 'An unexpected error occurred.' }
    }
}
