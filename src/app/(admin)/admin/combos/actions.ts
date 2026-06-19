'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addComboAction(
    restaurantId: string,
    comboData: {
        name: string
        description: string | null
        price: number
        category_id: string | null
        image_url: string | null
        is_available: boolean
    },
    items: { item_id: string; quantity: number }[]
) {
    try {
        const supabase = await createAdminClient()

        // 1. Insert into menu_items as a combo
        const { data: menuCombo, error: comboErr } = await supabase
            .from('menu_items')
            .insert({
                restaurant_id: restaurantId,
                name: comboData.name,
                description: comboData.description,
                price: comboData.price,
                category_id: comboData.category_id || null,
                image_url: comboData.image_url || null,
                is_available: comboData.is_available,
                is_combo: true, // Mark as combo
            })
            .select()
            .single()

        if (comboErr) {
            if (comboErr.message.includes('column "is_combo" does not exist')) {
                return { error: 'Database column "is_combo" is missing. Please run the SQL migration first!' }
            }
            return { error: comboErr.message }
        }

        // 2. Insert into combo_items
        if (items.length > 0) {
            const comboItemsData = items.map(item => ({
                combo_id: menuCombo.id,
                item_id: item.item_id,
                quantity: item.quantity,
            }))

            const { error: itemsErr } = await supabase
                .from('combo_items')
                .insert(comboItemsData)

            if (itemsErr) {
                // If inserting items fails, clean up the created combo
                await supabase.from('menu_items').delete().eq('id', menuCombo.id)
                if (itemsErr.message.includes('relation "public.combo_items" does not exist')) {
                    return { error: 'Database table "combo_items" is missing. Please run the SQL migration first!' }
                }
                return { error: itemsErr.message }
            }
        }

        revalidatePath('/admin/combos')
        revalidatePath('/admin/menu')
        return { data: menuCombo }
    } catch (err: any) {
        console.error('Error in addComboAction:', err)
        return { error: err.message || 'An unexpected error occurred.' }
    }
}

export async function updateComboAction(
    comboId: string,
    comboData: {
        name: string
        description: string | null
        price: number
        category_id: string | null
        image_url: string | null
        is_available: boolean
    },
    items: { item_id: string; quantity: number }[]
) {
    try {
        const supabase = await createAdminClient()

        // 1. Update menu_items entry
        const { error: comboErr } = await supabase
            .from('menu_items')
            .update({
                name: comboData.name,
                description: comboData.description,
                price: comboData.price,
                category_id: comboData.category_id || null,
                image_url: comboData.image_url || null,
                is_available: comboData.is_available,
            })
            .eq('id', comboId)

        if (comboErr) {
            return { error: comboErr.message }
        }

        // 2. Refresh combo_items constituents
        const { error: deleteErr } = await supabase
            .from('combo_items')
            .delete()
            .eq('combo_id', comboId)

        if (deleteErr) {
            return { error: deleteErr.message }
        }

        if (items.length > 0) {
            const comboItemsData = items.map(item => ({
                combo_id: comboId,
                item_id: item.item_id,
                quantity: item.quantity,
            }))

            const { error: itemsErr } = await supabase
                .from('combo_items')
                .insert(comboItemsData)

            if (itemsErr) {
                return { error: itemsErr.message }
            }
        }

        revalidatePath('/admin/combos')
        revalidatePath('/admin/menu')
        return { success: true }
    } catch (err: any) {
        console.error('Error in updateComboAction:', err)
        return { error: err.message || 'An unexpected error occurred.' }
    }
}

export async function deleteComboAction(comboId: string) {
    try {
        const supabase = await createAdminClient()

        // Deleting from menu_items will cascade delete from combo_items
        const { error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', comboId)

        if (error) {
            return { error: error.message }
        }

        revalidatePath('/admin/combos')
        revalidatePath('/admin/menu')
        return { success: true }
    } catch (err: any) {
        console.error('Error in deleteComboAction:', err)
        return { error: err.message || 'An unexpected error occurred.' }
    }
}
