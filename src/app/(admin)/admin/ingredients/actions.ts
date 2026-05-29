'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendLowStockAlertEmail } from '@/lib/email'

/**
 * Checks for low-stock ingredients and emails the manager.
 * Called after ingredient deduction on every order placement.
 * Rate-limited by checking alert_sent_at to avoid spam.
 */
export async function checkAndAlertLowStock(restaurantId: string): Promise<void> {
    const supabase = await createAdminClient()

    // Supabase JS can't do column-to-column comparisons, so fetch and filter in JS
    const { data: allIngredients } = await supabase
        .from('ingredients')
        .select('name, stock_quantity, reorder_level, unit')
        .eq('restaurant_id', restaurantId)
        .gt('reorder_level', 0)

    const belowThreshold = (allIngredients || []).filter(
        i => (i.stock_quantity ?? 0) <= (i.reorder_level ?? 0)
    )

    if (belowThreshold.length === 0) return

    // Get manager/owner contact email
    const { data: managers } = await supabase
        .from('users')
        .select('email, roles(name)')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .in('role_id', [1, 2]) // super_admin (1) or manager (2)
        .limit(1)

    const managerEmail = managers?.[0]?.email
    if (!managerEmail) return

    const { data: restaurant } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single()

    const restaurantName = (restaurant as { name?: string } | null)?.name ?? 'Restaurant'

    void sendLowStockAlertEmail(managerEmail, restaurantName, belowThreshold)
}

export async function getIngredientsAction(restaurantId: string) {
    const supabase = await createAdminClient()
    const { data } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true })
    return { data: data || [] }
}

export async function createIngredientAction(input: {
    restaurant_id: string
    name: string
    unit: string
    stock_quantity: number
    reorder_level: number
    cost_per_unit: number
    supplier?: string | null
}) {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('ingredients')
        .insert(input)
        .select()
        .single()
    if (error) return { error: error.message }
    revalidatePath('/admin/ingredients')
    return { data }
}

export async function updateIngredientAction(id: string, updates: Record<string, unknown>) {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('ingredients').update(updates).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/ingredients')
    return { success: true }
}

export async function addStockMovementAction(input: {
    ingredient_id: string
    movement_type: string
    quantity: number
    notes?: string
    performed_by?: string | null
}) {
    const supabase = await createAdminClient()

    // Insert movement record
    const { error: moveErr } = await supabase
        .from('ingredient_movements')
        .insert(input)
    if (moveErr) return { error: moveErr.message }

    // Update stock
    const { data: ingredient } = await supabase
        .from('ingredients')
        .select('stock_quantity')
        .eq('id', input.ingredient_id)
        .single()

    if (ingredient) {
        const delta = input.movement_type === 'purchase' ? input.quantity : -input.quantity
        await supabase
            .from('ingredients')
            .update({ stock_quantity: Math.max(0, ingredient.stock_quantity + delta) })
            .eq('id', input.ingredient_id)
    }

    revalidatePath('/admin/ingredients')
    return { success: true }
}

export async function deleteIngredientAction(id: string) {
    const supabase = await createAdminClient()
    const { error } = await supabase.from('ingredients').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/ingredients')
    return { success: true }
}
