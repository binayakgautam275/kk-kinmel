'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCategoryAction(restaurantId: string, name: string, sortOrder: number, isVisible: boolean) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('menu_categories')
        .insert({
            restaurant_id: restaurantId,
            name,
            sort_order: sortOrder,
            is_visible: isVisible
        })
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { data }
}

export async function updateCategoryAction(id: string, updates: Record<string, unknown>) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('menu_categories')
        .update(updates)
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}

export async function deleteCategoryAction(id: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}

export async function addItemAction(item: Record<string, unknown>) {
    const supabase = await createAdminClient()

    // Enforce plan menu item limit
    const restaurantId = item.restaurant_id as string
    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('max_menu_items')
        .eq('id', restaurantId)
        .single()

    const maxItems = (restaurant as { max_menu_items?: number } | null)?.max_menu_items ?? 9999

    const { count: currentCount } = await supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)

    if ((currentCount ?? 0) >= maxItems) {
        return { error: `Menu item limit reached. Your plan allows ${maxItems} items. Upgrade to add more.` }
    }

    const { data, error } = await supabase
        .from('menu_items')
        .insert(item)
        .select()
        .single()

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { data }
}

export async function updateItemAction(id: string, updates: Record<string, unknown>) {
    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}

export async function deleteItemAction(id: string) {
    const supabase = await createAdminClient()

    // 1. Check if the item has been ordered
    const { count, error: countErr } = await supabase
        .from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('menu_item_id', id)

    if (countErr) return { error: countErr.message }

    const isOrdered = (count ?? 0) > 0

    if (isOrdered) {
        // Soft delete since it has historical orders
        const { error: updateErr } = await supabase
            .from('menu_items')
            .update({ is_deleted: true, is_available: false, category_id: null })
            .eq('id', id)

        if (updateErr) {
            // Check if is_deleted column doesn't exist yet, try fallback update without it
            if (updateErr.message.includes('is_deleted') || updateErr.code === 'PGRST205' || updateErr.code === '42703') {
                const { error: fallbackErr } = await supabase
                    .from('menu_items')
                    .update({ is_available: false, category_id: null })
                    .eq('id', id)
                if (fallbackErr) return { error: fallbackErr.message }
            } else {
                return { error: updateErr.message }
            }
        }
    } else {
        // Hard delete since it has no orders
        const { error: deleteErr } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', id)

        if (deleteErr) {
            // Fallback to soft delete in case of other hidden relations (e.g. combo items)
            const { error: updateErr } = await supabase
                .from('menu_items')
                .update({ is_deleted: true, is_available: false, category_id: null })
                .eq('id', id)

            if (updateErr) {
                if (updateErr.message.includes('is_deleted') || updateErr.code === 'PGRST205' || updateErr.code === '42703') {
                    const { error: fallbackErr } = await supabase
                        .from('menu_items')
                        .update({ is_available: false, category_id: null })
                        .eq('id', id)
                    if (fallbackErr) return { error: fallbackErr.message }
                } else {
                    return { error: updateErr.message }
                }
            }
        }
    }

    revalidatePath('/admin/menu')
    return { success: true }
}

