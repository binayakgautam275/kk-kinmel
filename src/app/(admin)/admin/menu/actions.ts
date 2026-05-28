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
    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/admin/menu')
    return { success: true }
}
